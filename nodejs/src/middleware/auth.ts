/**
 * Middleware functions for Express application
 * Equivalent to Flask decorators and middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Authentication middleware - equivalent to @login_required decorator
 */
export function requireLogin(req: Request, res: Response, next: NextFunction) {
    if (req.session?.user && req.session.user.isActive) {
        req.user = req.session.user;
        next();
    } else {
        req.flash('error', 'Please log in to access this page.');
        res.redirect('/login');
    }
}

/**
 * Anonymous-only middleware - equivalent to @anonymous_required decorator
 */
export function requireAnonymous(req: Request, res: Response, next: NextFunction) {
    if (req.session?.user) {
        res.redirect('/dashboard');
    } else {
        next();
    }
}

/**
 * Active user middleware - equivalent to @active_user_required decorator
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction) {
    if (req.session?.user && req.session.user.isActive) {
        req.user = req.session.user;
        next();
    } else {
        req.flash('error', 'Your account is not active or you need to log in.');
        res.redirect('/login');
    }
}

/**
 * User validation middleware - equivalent to @validate_user_access decorator
 * Prevents horizontal privilege escalation
 */
export function validateUserAccess(req: Request, res: Response, next: NextFunction) {
    const requestedUserId = parseInt(req.params.userId || req.body.userId);
    
    if (!req.user) {
        req.flash('error', 'Authentication required.');
        return res.redirect('/login');
    }
    
    if (requestedUserId && req.user.id !== requestedUserId && req.user.role !== 'admin') {
        req.flash('error', 'Access denied. You can only access your own data.');
        return res.redirect('/dashboard');
    }
    
    next();
}

/**
 * Rate limiting for login attempts (session-based for training)
 */
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 login attempts per window
    message: {
        error: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use session ID for rate limiting (training purposes)
        return req.sessionID || req.ip || 'default';
    }
});

/**
 * Setup all middleware for the Express application
 */
export function setupMiddleware(app: express.Application): void {
    // Parse JSON and URL-encoded bodies
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Security headers (but keep some vulnerabilities for training)
    app.use(helmet({
        contentSecurityPolicy: false, // Disabled for training - allows XSS
        crossOriginEmbedderPolicy: false,
    }));
    
    // CORS configuration
    app.use(cors({
        origin: process.env.CORS_ORIGIN || true,
        credentials: true
    }));
    
    // Set up user session data for templates
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.session?.user) {
            req.user = req.session.user;
        }
        next();
    });
}
