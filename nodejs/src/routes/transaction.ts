/**
 * Transaction routes for Banking Security Training App
 * Contains intentionally vulnerable search functionality for SQL injection training
 */
import { Router, Request, Response } from 'express';
import { loginRequired, activeUserRequired } from '../middleware/auth';
import { AppDataSource } from '../database';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

const router = Router();

// Apply authentication middleware to all routes
router.use(loginRequired);
router.use(activeUserRequired);

/**
 * Transaction search page with vulnerable SQL injection
 * GET /transactions/search - Display search form and results
 * POST /transactions/search - Process search with vulnerable SQL
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const { company, amount_min, amount_max, date_from, date_to, advanced } = req.query;
        
        let transactions = [];
        let searchPerformed = false;
        
        if (company || amount_min || amount_max || date_from || date_to) {
            searchPerformed = true;
            
            if (advanced === 'true') {
                // VULNERABLE: Direct SQL injection for training
                transactions = await vulnerableAdvancedSearch(user.id, req.query);
            } else {
                // Safe: Using TypeORM query builder
                transactions = await safeBasicSearch(user.id, req.query);
            }
        }
        
        res.render('search', {
            transactions,
            searchPerformed,
            query: req.query,
            user
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).render('error', { 
            message: 'Search failed', 
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Transaction detail view with note editing capability
 * Vulnerable to template injection when editing notes
 */
router.get('/detail/:id', async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const transactionId = parseInt(req.params.id);
        
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const transaction = await transactionRepo.findOne({
            where: { id: transactionId, userId: user.id },
            relations: ['user']
        });
        
        if (!transaction) {
            return res.status(404).render('error', {
                message: 'Transaction not found or you do not have permission to view it.'
            });
        }
        
        // VULNERABLE: Template injection in note rendering
        let renderedNote = null;
        if (transaction.note) {
            try {
                // VULNERABILITY: Directly rendering user input as EJS template
                // This allows template injection attacks like <%= 7*7 %> or more dangerous payloads
                const ejs = require('ejs');
                renderedNote = ejs.render(transaction.note, {
                    user: user,
                    transaction: transaction,
                    // Expose other potentially dangerous objects
                    require: require,
                    process: process
                });
            } catch (templateError) {
                console.log('Template rendering error (potential injection attempt):', (templateError as Error).message);
                // Fall back to raw note if template rendering fails
                renderedNote = transaction.note;
            }
        }
        
        // Get related transactions for sidebar
        const relatedTransactions = await transactionRepo.find({
            where: { userId: user.id, company: transaction.company },
            order: { date: 'DESC' },
            take: 5
        });

        res.render('transaction', { 
            transaction, 
            user,
            renderedNote,
            relatedTransactions: relatedTransactions.filter(t => t.id !== transaction.id)
        });
    } catch (error) {
        console.error('Transaction detail error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load transaction',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Update transaction note with template injection vulnerability
 * POST /transactions/detail/:id - Handle note updates with template rendering
 */
router.post('/detail/:id', async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const transactionId = parseInt(req.params.id);
        const { transaction_note } = req.body;
        
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const transaction = await transactionRepo.findOne({
            where: { id: transactionId, userId: user.id },
            relations: ['user']
        });
        
        if (!transaction) {
            return res.status(404).render('error', {
                message: 'Transaction not found or you do not have permission to view it.'
            });
        }
        
        // Update the note
        transaction.note = transaction_note || null;
        await transactionRepo.save(transaction);
        
        // VULNERABLE: Template injection in note rendering
        let renderedNote = null;
        if (transaction.note) {
            try {
                // VULNERABILITY: Directly rendering user input as EJS template
                // This allows template injection attacks like <%= 7*7 %> or more dangerous payloads
                const ejs = require('ejs');
                renderedNote = ejs.render(transaction.note, {
                    user: user,
                    transaction: transaction,
                    // Expose other potentially dangerous objects
                    require: require,
                    process: process
                });
            } catch (templateError) {
                console.log('Template rendering error (potential injection attempt):', (templateError as Error).message);
                // Fall back to raw note if template rendering fails
                renderedNote = transaction.note;
            }
        }
        
        // Get related transactions for sidebar
        const relatedTransactions = await transactionRepo.find({
            where: { userId: user.id, company: transaction.company },
            order: { date: 'DESC' },
            take: 5
        });
        
        res.render('transaction', { 
            transaction, 
            user,
            renderedNote,
            relatedTransactions: relatedTransactions.filter(t => t.id !== transaction.id)
        });
    } catch (error) {
        console.error('Transaction note update error:', error);
        res.status(500).render('error', { 
            message: 'Failed to update transaction note',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * VULNERABLE: Advanced search using raw SQL with injection points
 * This is intentionally vulnerable for security training
 */
async function vulnerableAdvancedSearch(userId: number, query: any): Promise<any[]> {
    const { company, amount_min, amount_max, date_from, date_to, transaction_type, category, sort_by, sort_order } = query;
    
    // Build vulnerable SQL query with string concatenation
    let sql = `SELECT t.*, u.first_name, u.last_name FROM transactions t 
               LEFT JOIN users u ON t.user_id = u.id 
               WHERE t.user_id = ${userId}`;
    
    const conditions = [];
    
    if (company) {
        // VULNERABLE: Direct string interpolation - SQL injection point
        conditions.push(`t.company LIKE '%${company}%'`);
    }
    
    if (transaction_type) {
        // VULNERABLE: Direct string interpolation - SQL injection point
        conditions.push(`t.transaction_type = '${transaction_type}'`);
    }
    
    if (category) {
        // VULNERABLE: Direct string interpolation - SQL injection point
        conditions.push(`t.category LIKE '%${category}%'`);
    }
    
    if (amount_min) {
        // VULNERABLE: No parameter binding
        conditions.push(`t.amount >= ${amount_min}`);
    }
    
    if (amount_max) {
        // VULNERABLE: No parameter binding  
        conditions.push(`t.amount <= ${amount_max}`);
    }
    
    if (date_from) {
        // VULNERABLE: Date injection possible
        conditions.push(`t.date >= '${date_from}'`);
    }
    
    if (date_to) {
        // VULNERABLE: Date injection possible
        conditions.push(`t.date <= '${date_to}'`);
    }
    
    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }
    
    // Add ORDER BY clause with potential injection points
    let orderByClause = 't.date DESC'; // Default sorting
    
    if (sort_by) {
        // VULNERABLE: Direct column name injection possible
        const direction = sort_order === 'asc' ? 'ASC' : 'DESC';
        orderByClause = `t.${sort_by} ${direction}`;
    }
    
    sql += ` ORDER BY ${orderByClause} LIMIT 50`;
    
    console.log('Executing vulnerable SQL:', sql); // For training visibility
    
    const result = await AppDataSource.query(sql);
    
    // Map raw SQL results to match TypeORM entity property names
    // This ensures templates work consistently for both safe and vulnerable searches
    return result.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        transactionType: row.transaction_type,
        amount: row.amount,
        company: row.company,
        description: row.description,
        date: row.date,
        referenceNumber: row.reference_number,
        balanceAfter: row.balance_after,
        category: row.category,
        note: row.note,
        // Include user data if joined
        user: row.first_name ? {
            firstName: row.first_name,
            lastName: row.last_name
        } : null
    }));
}

/**
 * SAFE: Basic search using TypeORM query builder with proper parameterization
 */
async function safeBasicSearch(userId: number, query: any): Promise<Transaction[]> {
    const { company, amount_min, amount_max, date_from, date_to } = query;
    
    const transactionRepo = AppDataSource.getRepository(Transaction);
    let queryBuilder = transactionRepo.createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.user', 'user')
        .where('transaction.userId = :userId', { userId });
    
    if (company) {
        queryBuilder = queryBuilder.andWhere('transaction.company ILIKE :company', { 
            company: `%${company}%` 
        });
    }
    
    if (amount_min) {
        queryBuilder = queryBuilder.andWhere('transaction.amount >= :amount_min', { 
            amount_min: parseFloat(amount_min) 
        });
    }
    
    if (amount_max) {
        queryBuilder = queryBuilder.andWhere('transaction.amount <= :amount_max', { 
            amount_max: parseFloat(amount_max) 
        });
    }
    
    if (date_from) {
        queryBuilder = queryBuilder.andWhere('transaction.date >= :date_from', { 
            date_from: new Date(date_from) 
        });
    }
    
    if (date_to) {
        queryBuilder = queryBuilder.andWhere('transaction.date <= :date_to', { 
            date_to: new Date(date_to) 
        });
    }
    
    return await queryBuilder
        .orderBy('transaction.date', 'DESC')
        .limit(50)
        .getMany();
}

/**
 * Transaction archive page - displays historical transactions using mock stored procedure
 * GET/POST /transactions/archive - Archive search functionality
 */
router.get('/archive', async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        
        const availableYears = ['2020', '2021'];
        const availableMonths = [
            { value: '01', name: 'January' },
            { value: '02', name: 'February' },
            { value: '03', name: 'March' },
            { value: '04', name: 'April' },
            { value: '05', name: 'May' },
            { value: '06', name: 'June' },
            { value: '07', name: 'July' },
            { value: '08', name: 'August' },
            { value: '09', name: 'September' },
            { value: '10', name: 'October' },
            { value: '11', name: 'November' },
            { value: '12', name: 'December' }
        ];
        
        res.render('archive', {
            transactions: [],
            archivePerformed: false,
            availableYears,
            availableMonths,
            selectedYear: null,
            selectedMonth: null,
            summary: {
                totalCredits: 0,
                totalDebits: 0,
                recentActivityCount: 0,
                averageScore: 0
            },
            user
        });
    } catch (error) {
        console.error('Archive GET error:', error);
        res.status(500).render('error', { 
            message: 'Archive page failed to load',
            user: req.user 
        });
    }
});

router.post('/archive', async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const { archive_year, archive_month } = req.body;
        
        const availableYears = ['2020', '2021'];
        const availableMonths = [
            { value: '01', name: 'January' },
            { value: '02', name: 'February' },
            { value: '03', name: 'March' },
            { value: '04', name: 'April' },
            { value: '05', name: 'May' },
            { value: '06', name: 'June' },
            { value: '07', name: 'July' },
            { value: '08', name: 'August' },
            { value: '09', name: 'September' },
            { value: '10', name: 'October' },
            { value: '11', name: 'November' },
            { value: '12', name: 'December' }
        ];
        
        let transactions: any[] = [];
        let message = '';
        let messageType = '';
        
        if (!archive_year || !archive_month) {
            message = 'Please select both year and month.';
            messageType = 'error';
        } else {
            try {
                // Mock stored procedure call - simulates get_archived_transactions
                transactions = await callArchivedTransactionsProcedure(user.id, archive_year, archive_month);
                
                if (transactions.length > 0) {
                    message = `Found ${transactions.length} archived transactions for ${archive_month}/${archive_year}.`;
                    messageType = 'success';
                } else {
                    message = `No archived transactions found for ${archive_month}/${archive_year}.`;
                    messageType = 'info';
                }
            } catch (error: any) {
                message = `Error retrieving archived transactions: ${error.message}`;
                messageType = 'error';
            }
        }
        
        // Calculate summary statistics
        const totalCredits = transactions
            .filter(t => t.transaction_type === 'credit')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const totalDebits = transactions
            .filter(t => t.transaction_type === 'debit')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const summary = {
            totalCredits,
            totalDebits,
            recentActivityCount: transactions.length,
            averageScore: 0
        };
        
        res.render('archive', {
            transactions,
            archivePerformed: true,
            availableYears,
            availableMonths,
            selectedYear: archive_year,
            selectedMonth: archive_month,
            summary,
            message,
            messageType,
            user
        });
    } catch (error) {
        console.error('Archive POST error:', error);
        res.status(500).render('error', { 
            message: 'Archive search failed',
            user: req.user 
        });
    }
});

/**
 * VULNERABLE: Call get_archived_transactions stored procedure with SQL injection vulnerability
 * Matches the Python implementation's vulnerable stored procedure call
 */
async function callArchivedTransactionsProcedure(userId: number, year: string, month: string): Promise<any[]> {
    try {
        // VULNERABLE: Direct parameter substitution in stored procedure call
        // This allows SQL injection through the year and month parameters
        const procedureCall = `SELECT * FROM get_archived_transactions('${year}', '${month}') WHERE user_id = ${userId}`;
        
        console.log('Executing vulnerable stored procedure call:', procedureCall); // For training visibility
        
        const result = await AppDataSource.query(procedureCall);
        
        // Convert result rows to transaction-like objects
        return result.map((row: any) => {
            // Create object with helper method for credit/debit checking
            const transaction = {
                id: row.id,
                date: row.date,
                company: row.company || '',
                description: row.description || '',
                transaction_type: row.transaction_type || '',
                amount: row.amount || 0,
                balance_after: row.balance_after || 0,
                reference_number: row.reference_number || '',
                category: row.category || 'General',
                user_id: row.user_id,
                is_credit: function() {
                    return this.transaction_type?.toLowerCase() === 'credit';
                }
            };
            
            return transaction;
        });
        
    } catch (error: any) {
        console.error('Stored procedure call error:', error);
        throw new Error(`Database error: ${error.message}`);
    }
}

/**
 * SECURE: Alternative secure stored procedure call (commented for training)
 * This shows how to properly call the stored procedure with parameterized queries
 */
async function callArchivedTransactionsProcedureSecure(userId: number, year: string, month: string): Promise<any[]> {
    try {
        // SECURE: Using parameterized query to prevent injection
        const procedureCall = `SELECT * FROM get_archived_transactions($1, $2) WHERE user_id = $3`;
        
        const result = await AppDataSource.query(procedureCall, [year, month, userId]);
        
        return result.map((row: any) => ({
            id: row.id,
            date: row.date,
            company: row.company || '',
            description: row.description || '',
            transaction_type: row.transaction_type || '',
            amount: row.amount || 0,
            balance_after: row.balance_after || 0,
            reference_number: row.reference_number || '',
            category: row.category || 'General',
            user_id: row.user_id,
            is_credit: function() {
                return this.transaction_type?.toLowerCase() === 'credit';
            }
        }));
        
    } catch (error: any) {
        console.error('Stored procedure call error:', error);
        throw new Error(`Database error: ${error.message}`);
    }
}

export default router;