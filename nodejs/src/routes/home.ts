/**
 * Home routes - equivalent to Python application/home.py
 */

import { Router, Request, Response } from 'express';
import { requireActiveUser } from '../middleware';
import { getDatabaseStats } from '../config/database';
import { AppDataSource } from '../config/database';
import { Transaction } from '../models/transaction';
import { Feedback } from '../models/feedback';

export const homeRouter = Router();

/**
 * Home page with bank statistics and login form
 * Equivalent to index() in Python home.py
 */
homeRouter.get('/', async (req: Request, res: Response) => {
    try {
        // Get database statistics for display
        const stats = await getDatabaseStats();
        res.render('index', { stats });
    } catch (error) {
        console.error('Database not ready:', error);
        const stats = {
            total_users: 0,
            total_transactions: 0,
            total_volume: 0,
            monthly_volume: 0
        };
        res.render('index', { stats });
    }
});

/**
 * User dashboard showing account overview and recent transactions
 * Equivalent to dashboard() in Python home.py
 */
homeRouter.get('/dashboard', requireActiveUser, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        
        // Get pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const perPage = 20;
        const offset = (page - 1) * perPage;
        
        // Get user's transactions with pagination
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const [transactions, totalTransactions] = await transactionRepo.findAndCount({
            where: { userId: user.id },
            order: { date: 'DESC' },
            take: perPage,
            skip: offset
        });
        
        // Calculate pagination info
        const totalPages = Math.ceil(totalTransactions / perPage);
        const paginatedTransactions = {
            data: transactions,
            page,
            perPage,
            total: totalTransactions,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
        
        // Calculate account summary
        const creditSum = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId AND transaction.transactionType = :type', 
                   { userId: user.id, type: 'credit' })
            .getRawOne();
            
        const debitSum = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId AND transaction.transactionType = :type', 
                   { userId: user.id, type: 'debit' })
            .getRawOne();
        
        const totalCredits = parseFloat(creditSum?.total || '0');
        const totalDebits = parseFloat(debitSum?.total || '0');
        
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivityCount = await transactionRepo.count({
            where: {
                userId: user.id,
                date: new Date(thirtyDaysAgo.toISOString()) // Convert to proper date format
            }
        });
        
        // Get average score from feedback
        const averageScore = await Feedback.getAverageScore();
        
        const summary = {
            total_credits: totalCredits,
            total_debits: totalDebits,
            recent_activity_count: recentActivityCount,
            average_score: averageScore
        };
        
        res.render('dashboard', { 
            transactions: paginatedTransactions, 
            summary 
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});
