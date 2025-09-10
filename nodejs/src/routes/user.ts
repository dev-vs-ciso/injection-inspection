/**
 * User routes - equivalent to Python application/user.py
 * Handles authentication, login, logout, profile management
 */

import { Router, Request, Response } from 'express';
import { requireAnonymous, requireActiveUser, loginRateLimit } from '../middleware';
import { User } from '../models/user';
import { AppDataSource } from '../config/database';

export const userRouter = Router();

/**
 * Login page and authentication
 * Equivalent to login() in Python user.py
 */
userRouter.get('/login', requireAnonymous, (req: Request, res: Response) => {
    res.render('login');
});

userRouter.post('/login', loginRateLimit, requireAnonymous, async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.flash('error', 'Email and password are required.');
            return res.redirect('/login');
        }
        
        // VULNERABLE: Use the intentionally vulnerable authentication method
        const user = await User.authenticate(email, password);
        
        if (user) {
            // Store user ID in session (for middleware compatibility)
            (req.session as any).userId = user.id;
            req.session.user = user; // Keep for flash message access
            
            req.flash('success', `Welcome back, ${user.firstName}!`);
            res.redirect('/dashboard');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login. Please try again.');
        res.redirect('/login');
    }
});

/**
 * Logout route
 * Equivalent to logout() in Python user.py
 */
userRouter.get('/logout', (req: Request, res: Response) => {
    const userName = req.session?.user?.firstName || 'User';
    
    // Clear session data
    delete (req.session as any).userId;
    delete req.session.user;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.clearCookie('connect.sid');
        req.flash('info', `Goodbye, ${userName}!`);
        res.redirect('/');
    });
});

/**
 * User profile page
 * Equivalent to profile() in Python user.py
 */
userRouter.get('/profile', requireActiveUser, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        
        // Get user's recent transaction count
        const transactionRepo = AppDataSource.getRepository('Transaction');
        const recentTransactionCount = await transactionRepo.count({
            where: { userId: user.id }
        });
        
        res.render('profile', { 
            user, 
            recentTransactionCount 
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error', 'Error loading profile.');
        res.redirect('/dashboard');
    }
});

/**
 * User preferences page
 * Equivalent to preferences() in Python user.py
 */
userRouter.get('/preferences', requireActiveUser, (req: Request, res: Response) => {
    const user = req.user!;
    res.render('preferences', { user });
});

userRouter.post('/preferences', requireActiveUser, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const { firstName, lastName, email } = req.body;
        
        if (!firstName || !lastName || !email) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/preferences');
        }
        
        // Update user information
        const userRepo = AppDataSource.getRepository(User);
        await userRepo.update(user.id, {
            firstName,
            lastName,
            email
        });
        
        // Update session data with fresh user object
        const updatedUser = await userRepo.findOne({ where: { id: user.id } });
        if (updatedUser) {
            req.session.user = updatedUser;
            req.user = updatedUser;
        }
        
        req.flash('success', 'Preferences updated successfully.');
        res.redirect('/preferences');
        
    } catch (error) {
        console.error('Preferences update error:', error);
        req.flash('error', 'Error updating preferences.');
        res.redirect('/preferences');
    }
});
