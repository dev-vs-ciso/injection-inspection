/**
 * Home routes for the banking application
 * Handles index and dashboard pages
 */
import { Router, Request, Response } from 'express';
import { activeUserRequired } from '../middleware/auth';
import { getDatabaseStats } from '../database';
import { User, Transaction, Feedback } from '../models';
import { AppDataSource } from '../database';

const router = Router();

// Home page
router.get('/', async (req: Request, res: Response) => {
    try {
        // Get bank statistics for the home page
        const stats = await getDatabaseStats();
        
        // Get feedback statistics for customer rating
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        const avgRatingResult = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('AVG(feedback.score)', 'average')
            .getRawOne();
        
        const averageScore = parseFloat(avgRatingResult?.average || '4.5');
        
        // Calculate monthly volume (current month)
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const monthlyVolumeResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.date >= :currentMonth', { currentMonth })
            .getRawOne();
        
        const monthlyVolume = parseFloat(monthlyVolumeResult?.total || '0');
        
        // Enhanced stats object
        const enhancedStats = {
            ...stats,
            average_score: averageScore,
            monthly_volume: monthlyVolume
        };
        
        res.render('index', {
            title: 'Home',
            user: req.user || null,
            stats: enhancedStats
        });
        
    } catch (error) {
        console.error('Home page error:', error);
        res.render('index', {
            title: 'Home',
            user: req.user || null,
            stats: {
                total_users: 0,
                total_transactions: 0,
                total_volume: 0,
                average_score: 4.5,
                monthly_volume: 0
            }
        });
    }
});

// Dashboard page (requires authentication)
router.get('/dashboard', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        
        // Get user's recent transactions
        const recentTransactions = await user.getRecentTransactions(5);
        
        // Get bank statistics
        const stats = await getDatabaseStats();
        
        // Get recent feedback for the dashboard
        const recentFeedback = await Feedback.getRecentFeedback(3);
        
        // Calculate user-specific statistics
        const transactionRepo = AppDataSource.getRepository(Transaction);
        
        const userTransactionCount = await transactionRepo.count({
            where: { userId: user.id }
        });
        
        // Get user's total spending (debit transactions)
        const userSpendingResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId', { userId: user.id })
            .andWhere('transaction.transactionType = :type', { type: 'debit' })
            .getRawOne();
        
        const userSpending = parseFloat(userSpendingResult?.total || '0');
        
        // Get user's monthly spending (current month)
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const monthlySpendingResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId', { userId: user.id })
            .andWhere('transaction.transactionType = :type', { type: 'debit' })
            .andWhere('transaction.date >= :currentMonth', { currentMonth })
            .getRawOne();
        
        const monthlySpending = parseFloat(monthlySpendingResult?.total || '0');
        
        const userStats = {
            transactionCount: userTransactionCount,
            totalSpending: userSpending,
            monthlySpending: monthlySpending,
            balance: user.balance
        };
        
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            recentTransactions,
            stats,
            userStats,
            recentFeedback
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', {
            title: 'Dashboard Error',
            message: 'Error loading dashboard data.'
        });
    }
});

export default router;