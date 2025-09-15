/**
 * Feedback routes with intentional XSS vulnerabilities for security training
 * Node.js TypeScript port of the Flask feedback functionality
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Feedback } from '../models/Feedback';
import { User } from '../models/User';
import { activeUserRequired } from '../middleware/auth';

const router = Router();

// Test route to verify feedback routes are working
router.get('/test', (req: Request, res: Response) => {
    res.json({ message: 'Feedback routes are working', user: req.user ? 'authenticated' : 'anonymous' });
});

/**
 * Public feedback list page - shows all feedback entries
 * Anyone can view this page (no authentication required)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        
        // Get all feedback entries with user information
        const feedbackEntries = await feedbackRepo.find({
            relations: ['user'],
            order: {
                createdAt: 'DESC'
            }
        });
        
        // Calculate statistics
        const scoreDistribution = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('feedback.score', 'score')
            .addSelect('COUNT(*)', 'count')
            .groupBy('feedback.score')
            .getRawMany();
        
        const averageResult = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('AVG(feedback.score)', 'average')
            .getRawOne();
        
        const averageScore = parseFloat(averageResult?.average || '0');
        const totalFeedback = feedbackEntries.length;
        
        res.render('feedback_list', {
            title: 'Customer Feedback',
            feedback_entries: feedbackEntries,
            score_distribution: scoreDistribution,
            average_score: averageScore,
            total_feedback: totalFeedback,
            user: req.user || null
        });
        
    } catch (error) {
        console.error('Error fetching feedback list:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load feedback list',
            user: req.user || null
        });
    }
});

/**
 * Public feedback detail page - shows individual feedback entry
 * Anyone can view this page (no authentication required)
 * VULNERABLE: Displays user content without escaping (XSS vulnerability)
 */
router.get('/detail/:id', async (req: Request, res: Response) => {
    try {
        const feedbackId = parseInt(req.params.id);
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        
        const feedback = await feedbackRepo.findOne({
            where: { id: feedbackId },
            relations: ['user']
        });
        
        if (!feedback) {
            return res.status(404).render('error', {
                title: 'Feedback Not Found',
                message: 'The requested feedback entry was not found.',
                user: req.user || null
            });
        }
        
        // Get other feedback from the same user (if not anonymous)
        let otherFeedback: Feedback[] = [];
        if (!feedback.isAnonymous && feedback.user) {
            otherFeedback = await feedbackRepo.find({
                where: { 
                    user: { id: feedback.user.id }
                },
                relations: ['user'],
                order: { createdAt: 'DESC' },
                take: 5
            });
            
            // Remove current feedback from the list
            otherFeedback = otherFeedback.filter(f => f.id !== feedback.id);
        }
        
        res.render('feedback_detail', {
            title: 'Feedback Details',
            feedback: feedback,
            other_feedback: otherFeedback,
            user: req.user || null
        });
        
    } catch (error) {
        console.error('Error fetching feedback detail:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load feedback details',
            user: req.user || null
        });
    }
});

/**
 * Feedback submission form for authenticated users
 * GET: Show feedback form
 * POST: Process feedback submission
 * VULNERABLE: Stores user input without sanitization (XSS vulnerability)
 */
router.get('/submit', activeUserRequired, (req: Request, res: Response) => {
    res.render('submit_feedback', {
        title: 'Submit Feedback',
        user: req.user
    });
});

router.post('/submit', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const { score, message, is_anonymous } = req.body;
        
        // Basic validation
        if (!score || !message) {
            return res.render('submit_feedback', {
                title: 'Submit Feedback',
                user: req.user,
                error: 'Please provide both a rating and feedback message.',
                formData: req.body
            });
        }
        
        const scoreNum = parseInt(score);
        if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
            return res.render('submit_feedback', {
                title: 'Submit Feedback',
                user: req.user,
                error: 'Rating must be between 1 and 5 stars.',
                formData: req.body
            });
        }
        
        // Check message length
        if (message.length > 500) {
            return res.render('submit_feedback', {
                title: 'Submit Feedback',
                user: req.user,
                error: 'Feedback message must be 500 characters or less.',
                formData: req.body
            });
        }
        
        // VULNERABILITY: Store user input directly without sanitization
        // This allows XSS attacks through the message field
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        const feedback = new Feedback();
        feedback.user = req.user!;
        feedback.score = scoreNum;
        feedback.message = message; // VULNERABLE: No HTML escaping or sanitization
        feedback.isAnonymous = Boolean(is_anonymous);
        
        await feedbackRepo.save(feedback);
        
        res.render('submit_feedback', {
            title: 'Submit Feedback',
            user: req.user,
            success: 'Thank you for your feedback! Your input helps us improve our services.'
        });
        
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.render('submit_feedback', {
            title: 'Submit Feedback',
            user: req.user,
            error: 'An error occurred while submitting your feedback. Please try again.',
            formData: req.body
        });
    }
});

/**
 * Show all feedback by a specific user
 * VULNERABLE: Displays all user feedback without proper authorization (IDOR)
 * Anyone can view any user's feedback by changing the user ID in the URL
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const userRepo = AppDataSource.getRepository(User);
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        
        const user = await userRepo.findOne({ where: { id: userId } });
        
        if (!user) {
            return res.status(404).render('error', {
                title: 'User Not Found',
                message: 'The requested user was not found.',
                user: req.user || null
            });
        }
        
        // VULNERABLE: No authorization check - anyone can view any user's feedback
        // This is an Insecure Direct Object Reference (IDOR) vulnerability
        const feedbackEntries = await feedbackRepo.find({
            where: { user: { id: userId } },
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        
        res.render('feedback_by_user', {
            title: `Feedback by ${user.firstName} ${user.lastName}`,
            target_user: user,
            feedback_entries: feedbackEntries,
            user: req.user || null
        });
        
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load user feedback',
            user: req.user || null
        });
    }
});

/**
 * Search feedback entries
 * VULNERABLE: Search functionality with potential XSS in search terms display
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const searchTerm = req.query.q as string || '';
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        
        let feedbackEntries: Feedback[] = [];
        
        if (searchTerm) {
            // Search in feedback messages
            feedbackEntries = await feedbackRepo
                .createQueryBuilder('feedback')
                .leftJoinAndSelect('feedback.user', 'user')
                .where('feedback.message ILIKE :search', { search: `%${searchTerm}%` })
                .orderBy('feedback.createdAt', 'DESC')
                .getMany();
        }
        
        res.render('feedback_search', {
            title: 'Search Feedback',
            search_term: searchTerm, // VULNERABLE: Search term displayed without escaping
            feedback_entries: feedbackEntries,
            user: req.user || null
        });
        
    } catch (error) {
        console.error('Error searching feedback:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to search feedback',
            user: req.user || null
        });
    }
});

export default router;