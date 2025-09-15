/**
 * Custom middleware for the Banking Application
 * Provides authentication and security decorators equivalent to Flask decorators
 */
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AppDataSource } from '../database';

// Extend session interface for this module
declare module 'express-session' {
    interface SessionData {
        userId?: number;
        nextUrl?: string;
        loginAttempts?: string[];
        standardPreferences?: any;
        customConfig?: any;
    }
}

export const loginRequired = async (req: Request, res: Response, next: NextFunction) => {
    /**
     * Middleware to require user authentication
     * Redirects to login page if user is not authenticated
     * Preserves the original URL for redirect after login
     */
    const session = req.session as any; // Type assertion to bypass session typing issues
    
    if (!session.userId) {
        session.nextUrl = req.originalUrl;
        return res.redirect('/login');
    }

    try {
        // Load user from database
        const userRepo = AppDataSource.getRepository(User);
        
        const user = await userRepo.findOne({ where: { id: session.userId } });
        
        if (!user) {
            session.userId = undefined;
            session.nextUrl = req.originalUrl;
            return res.redirect('/login');
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in loginRequired middleware:', error);
        session.userId = undefined;
        return res.redirect('/login');
    }
};

export const activeUserRequired = async (req: Request, res: Response, next: NextFunction) => {
    /**
     * Middleware to require active user status
     * Ensures that only active users can access protected resources
     */
    if (!(req.session as any).userId) {
        (req.session as any).nextUrl = req.originalUrl;
        return res.redirect('/login');
    }

    try {
        // Load user from database
        const { User } = await import('../models');
        const { AppDataSource } = await import('../database');
        const userRepo = AppDataSource.getRepository(User);
        
        const user = await userRepo.findOne({ where: { id: (req.session as any).userId } });
        
        if (!user) {
            (req.session as any).userId = undefined;
            (req.session as any).nextUrl = req.originalUrl;
            return res.redirect('/login');
        }
        
        if (!user.isActive) {
            (req.session as any).userId = undefined;
            return res.status(403).render('error', {
                title: 'Account Deactivated',
                message: 'Your account has been deactivated. Please contact support.',
                user: null
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in activeUserRequired middleware:', error);
        (req.session as any).userId = undefined;
        return res.redirect('/login');
    }
};

export const anonymousRequired = (req: Request, res: Response, next: NextFunction) => {
    /**
     * Middleware to require anonymous user (not logged in)
     * Redirects authenticated users to dashboard
     * Useful for login/register pages that shouldn't be accessible to logged-in users
     */
    if ((req.session as any).userId) {
        return res.redirect('/dashboard');
    }
    next();
};

export const validateUserAccess = (req: Request, res: Response, next: NextFunction) => {
    /**
     * Middleware to validate that user can only access their own data
     * Compares the user_id parameter with current user's id
     */
    if (!req.user) {
        return res.redirect('/login');
    }

    const userId = parseInt(req.params.userId);
    if (userId && userId !== req.user.id) {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You can only access your own data.',
            user: req.user
        });
    }

    next();
};

export const rateLimitLogin = (maxAttempts: number = 5, windowMinutes: number = 15) => {
    /**
     * Middleware factory for rate limiting login attempts
     * maxAttempts: Maximum number of attempts allowed
     * windowMinutes: Time window in minutes for rate limiting
     */
    return (req: Request, res: Response, next: NextFunction) => {
        // In a production environment, you would use Redis or similar
        // For this training app, we'll use session storage
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const attemptsKey = `login_attempts_${clientIp}`;
        
        // Get current attempts from session
        const attempts = (req.session as any).loginAttempts || [];
        
        // Clean old attempts (older than windowMinutes)
        const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
        const recentAttempts = attempts.filter((attempt: string) => new Date(attempt) > cutoffTime);
        
        // Check if too many attempts
        if (recentAttempts.length >= maxAttempts) {
            return res.status(429).render('error', {
                title: 'Too Many Attempts',
                message: `Too many login attempts. Please wait ${windowMinutes} minutes before trying again.`,
                user: null
            });
        }
        
        // Store cleaned attempts back to session
        (req.session as any).loginAttempts = recentAttempts;
        
        next();
    };
};

export const addLoginAttempt = (req: Request, res: Response, next: NextFunction) => {
    /**
     * Middleware to record a failed login attempt
     */
    if (!(req.session as any).loginAttempts) {
        (req.session as any).loginAttempts = [];
    }

    (req.session as any).loginAttempts.push(new Date().toISOString());
    next();
};

// Global error handler middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Application error:', error);
    
    // In development, show full error details
    if (process.env.NODE_ENV === 'development') {
        return res.status(500).render('error', {
            title: 'Application Error',
            message: error.message,
            stack: error.stack,
            user: req.user || null
        });
    }
    
    // In production, show generic error message
    res.status(500).render('error', {
        title: 'Internal Server Error',
        message: 'Something went wrong. Please try again later.',
        user: req.user || null
    });
};

// 404 handler middleware
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: `The page ${req.originalUrl} was not found.`,
        user: req.user || null
    });
};