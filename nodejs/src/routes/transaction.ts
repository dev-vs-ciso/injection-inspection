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
        
        res.render('transaction', { transaction, user });
    } catch (error) {
        console.error('Transaction detail error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load transaction',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * VULNERABLE: Advanced search using raw SQL with injection points
 * This is intentionally vulnerable for security training
 */
async function vulnerableAdvancedSearch(userId: number, query: any): Promise<any[]> {
    const { company, amount_min, amount_max, date_from, date_to } = query;
    
    // Build vulnerable SQL query with string concatenation
    let sql = `SELECT t.*, u.first_name, u.last_name FROM transactions t 
               LEFT JOIN users u ON t.user_id = u.id 
               WHERE t.user_id = ${userId}`;
    
    const conditions = [];
    
    if (company) {
        // VULNERABLE: Direct string interpolation - SQL injection point
        conditions.push(`t.company LIKE '%${company}%'`);
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
    
    sql += ' ORDER BY t.date DESC LIMIT 50';
    
    console.log('Executing vulnerable SQL:', sql); // For training visibility
    
    const result = await AppDataSource.query(sql);
    return result;
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
 * Mock stored procedure to simulate get_archived_transactions
 * In a real app, this would call an actual stored procedure
 */
async function callArchivedTransactionsProcedure(userId: number, year: string, month: string): Promise<any[]> {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    
    // Create date range for the specified month/year
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    // Query transactions in the date range (simulating stored procedure)
    const transactions = await transactionRepo
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.user', 'user')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.date >= :startDate', { startDate })
        .andWhere('transaction.date <= :endDate', { endDate })
        .orderBy('transaction.date', 'DESC')
        .getMany();
    
    // Convert to archive format (simulating stored procedure result structure)
    return transactions.map(t => ({
        id: t.id,
        date: t.date,
        company: t.company,
        description: t.description,
        transaction_type: t.transactionType,
        amount: t.amount,
        balance_after: t.balanceAfter,
        reference_number: t.referenceNumber,
        category: t.category || 'General',
        user_id: t.userId,
        is_credit: () => t.transactionType === 'credit'
    }));
}

export default router;