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
        
        // Get pagination parameters (matching Python implementation)
        const page = parseInt(req.query.page as string) || 1;
        const perPage = 20;
        const skip = (page - 1) * perPage;
        
        // Get user's transactions with pagination
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const [transactions, totalCount] = await transactionRepo.findAndCount({
            where: { userId: user.id },
            order: { date: 'DESC' },
            take: perPage,
            skip: skip
        });
        
        // Create pagination object similar to Python Flask-SQLAlchemy
        const totalPages = Math.ceil(totalCount / perPage);
        const paginatedTransactions = {
            items: transactions,
            page: page,
            pages: totalPages,
            per_page: perPage,
            total: totalCount,
            has_prev: page > 1,
            has_next: page < totalPages,
            prev_num: page > 1 ? page - 1 : null,
            next_num: page < totalPages ? page + 1 : null
        };
        
        // Get bank statistics
        const stats = await getDatabaseStats();
        
        // Get recent feedback for the dashboard
        const recentFeedback = await Feedback.getRecentFeedback(3);
        
        // Calculate account summary (matching Python implementation)
        const summaryTransactionRepo = AppDataSource.getRepository(Transaction);
        
        // Calculate total credits
        const totalCreditsResult = await summaryTransactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId', { userId: user.id })
            .andWhere('transaction.transactionType = :type', { type: 'credit' })
            .getRawOne();
        
        const totalCredits = parseFloat(totalCreditsResult?.total || '0');
        
        // Calculate total debits
        const totalDebitsResult = await summaryTransactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.userId = :userId', { userId: user.id })
            .andWhere('transaction.transactionType = :type', { type: 'debit' })
            .getRawOne();
        
        const totalDebits = parseFloat(totalDebitsResult?.total || '0');
        
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivityCount = await summaryTransactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.userId = :userId', { userId: user.id })
            .andWhere('transaction.date >= :thirtyDaysAgo', { thirtyDaysAgo })
            .getCount();
        
        // Get average feedback score
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        const avgScoreResult = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('AVG(feedback.score)', 'average')
            .getRawOne();
        
        const averageScore = parseFloat(avgScoreResult?.average || '4.5');
        
        const summary = {
            total_credits: totalCredits,
            total_debits: totalDebits,
            recent_activity_count: recentActivityCount,
            average_score: averageScore
        };
        
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            transactions: paginatedTransactions,
            stats,
            summary,
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

// Search Backup Route (alternative search interface)
router.get('/search-backup', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const searchParams = req.query;
        
        let transactions: Transaction[] = [];
        let searchPerformed = false;
        
        // Check if any search parameters were provided
        const hasSearchParams = Object.keys(searchParams).some(key => {
            const value = searchParams[key];
            return value && typeof value === 'string' && value.trim() !== '';
        });
        
        if (hasSearchParams) {
            searchPerformed = true;
            
            const transactionRepo = AppDataSource.getRepository(Transaction);
            let query = transactionRepo
                .createQueryBuilder('transaction')
                .where('transaction.user_id = :userId', { userId: user.id });
            
            // Apply filters
            if (searchParams.company && typeof searchParams.company === 'string') {
                query = query.andWhere('transaction.company ILIKE :company', { 
                    company: `%${searchParams.company}%` 
                });
            }
            
            if (searchParams.amount && typeof searchParams.amount === 'string') {
                const amount = parseFloat(searchParams.amount);
                if (!isNaN(amount)) {
                    query = query.andWhere('transaction.amount = :amount', { amount });
                }
            }
            
            if (searchParams.date_from && typeof searchParams.date_from === 'string') {
                query = query.andWhere('transaction.date >= :dateFrom', { 
                    dateFrom: searchParams.date_from 
                });
            }
            
            if (searchParams.date_to && typeof searchParams.date_to === 'string') {
                query = query.andWhere('transaction.date <= :dateTo', { 
                    dateTo: searchParams.date_to 
                });
            }
            
            if (searchParams.transaction_type && typeof searchParams.transaction_type === 'string') {
                query = query.andWhere('transaction.transaction_type = :type', { 
                    type: searchParams.transaction_type 
                });
            }
            
            if (searchParams.category && typeof searchParams.category === 'string') {
                query = query.andWhere('transaction.category ILIKE :category', { 
                    category: `%${searchParams.category}%` 
                });
            }
            
            transactions = await query
                .orderBy('transaction.date', 'DESC')
                .limit(50) // Limit results for performance
                .getMany();
        }
        
        res.render('search_backup', {
            title: 'Search Transactions',
            user,
            transactions,
            searchParams,
            searchPerformed
        });
        
    } catch (error) {
        console.error('Search backup error:', error);
        res.status(500).render('error', {
            title: 'Search Error',
            message: 'Error performing search.',
            user: req.user
        });
    }
});

export default router;