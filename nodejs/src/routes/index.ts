/**
 * Route setup for Express application
 * Equivalent to Flask URL routing setup
 */

import express from 'express';
import { homeRouter } from './home';
import { userRouter } from './user';
import { transactionRouter } from './transaction';
import { feedbackRouter } from './feedback';
import { apiRouter } from './api';
import { aiRouter } from './ai';

/**
 * Setup all routes for the Express application
 */
export function setupRoutes(app: express.Application): void {
    // Home routes
    app.use('/', homeRouter);
    
    // User authentication routes
    app.use('/', userRouter);
    
    // Transaction routes
    app.use('/', transactionRouter);
    
    // Feedback routes
    app.use('/feedback', feedbackRouter);
    
    // API routes
    app.use('/api', apiRouter);
    
    // AI routes
    app.use('/ai', aiRouter);
}
