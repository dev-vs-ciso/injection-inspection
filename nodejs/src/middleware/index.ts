/**
 * Middleware setup for Express app
 * Equivalent to Flask decorators and middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { AppDataSource } from '../config/database';
import { User } from '../models/user';

/**
 * Setup all middleware for the Express application
 */
export function setupMiddleware(app: express.Application): void {
    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security headers (but relaxed for vulnerability demonstration)
    app.use(helmet({
        contentSecurityPolicy: false, // Disabled to allow inline scripts for XSS demonstration
        xssFilter: false, // Disabled for XSS training scenarios
    }));

    // CORS setup
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    }));

    // Rate limiting (basic implementation for training)
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Limit each IP to 1000 requests per windowMs (generous for training)
        message: 'Too many requests from this IP, please try again later.'
    });
    app.use(limiter);

    // User authentication middleware (equivalent to Flask-Login user_loader)
    app.use(async (req: Request, res: Response, next: NextFunction) => {
        if (req.session && (req.session as any).userId) {
            try {
                const userRepo = AppDataSource.getRepository(User);
                const user = await userRepo.findOne({ 
                    where: { id: (req.session as any).userId, isActive: true }
                });
                
                if (user) {
                    req.user = user;
                    req.isAuthenticated = () => true;
                } else {
                    // User not found or inactive, clear session
                    delete (req.session as any).userId;
                    req.isAuthenticated = () => false;
                }
            } catch (error) {
                console.error('Error loading user from session:', error);
                req.isAuthenticated = () => false;
            }
        } else {
            req.isAuthenticated = () => false;
        }
        
        next();
    });
}

/**
 * Authentication middleware (equivalent to @login_required decorator)
 */
export function requireLogin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !req.isAuthenticated?.()) {
        req.flash('error', 'Please log in to access this page.');
        res.redirect('/login');
        return;
    }
    next();
}

/**
 * Anonymous user middleware (equivalent to @anonymous_required decorator)
 */
export function requireAnonymous(req: Request, res: Response, next: NextFunction): void {
    if (req.user && req.isAuthenticated?.()) {
        res.redirect('/dashboard');
        return;
    }
    next();
}

/**
 * Active user middleware (equivalent to @active_user_required decorator)
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !req.isAuthenticated?.() || !req.user.isActive) {
        req.flash('error', 'Your account is not active or you need to log in.');
        res.redirect('/login');
        return;
    }
    next();
}

/**
 * Admin role middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !req.isAuthenticated?.() || req.user.role !== 'admin') {
        req.flash('error', 'Administrator access required.');
        res.redirect('/dashboard');
        return;
    }
    next();
}

/**
 * User access validation (prevent horizontal privilege escalation)
 */
export function validateUserAccess(paramName: string = 'userId') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const requestedUserId = parseInt(req.params[paramName]);
        
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        
        // Admin can access any user's data
        if (req.user.role === 'admin') {
            next();
            return;
        }
        
        // Regular users can only access their own data
        if (req.user.id !== requestedUserId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        
        next();
    };
}

/**
 * Rate limiting for login attempts
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
        return req.sessionID || req.ip || 'default';
    }
});
