/**
 * Main Express application for Banking Security Training
 * Node.js/TypeScript equivalent of the Python Flask application
 * 
 * SECURITY WARNING: This application contains intentional vulnerabilities 
 * for educational purposes. Do not use in production!
 */

import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from "./config/database"
import { Config } from './config/config';
import './types'; // Import type definitions
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { User } from '@/models/user';

// Load environment variables
dotenv.config();

/**
 * Create Express application instance
 */
export function createApp(): express.Application {
    const app = express();
    const config = new Config();

    // View engine setup
    app.set('views', path.join(__dirname, '../views'));
    app.set('view engine', 'ejs');

    // Static files
    app.use(express.static(path.join(__dirname, '../public')));

    // Session configuration (mirroring Flask session settings)
    app.use(session({
        secret: config.SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: config.SESSION_COOKIE_SECURE,
            httpOnly: true,
            maxAge: config.SESSION_TIMEOUT,
            sameSite: 'lax'
        }
    }));

    // Flash messages
    app.use(flash());

    // Setup middleware (authentication, security, etc.)
    setupMiddleware(app);

    // Global template variables (like Flask's context_processor)
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.locals.BANK_NAME = config.BANK_NAME;
        res.locals.user = req.user || null;
        res.locals.messages = req.flash();
        next();
    });

    // Setup routes
    setupRoutes(app);

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error('Error:', err);
        res.status(500).render('error', { 
            error: err,
            message: 'Something went wrong!'
        });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).render('error', {
            error: new Error('Page not found'),
            message: 'The page you requested could not be found.'
        });
    });

    return app;
}

/**
 * Initialize database and start server
 */
async function startServer() {
    try {
        // Initialize database connection
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connection established');

        // Create Express app
        const app = createApp();
        
        // Start server
        const port = process.env.PORT || 3000;
        const host = process.env.HOST || '0.0.0.0';
        
        app.listen(port, () => {
            console.log('🏦 Banking Security Training Application (Node.js)');
            console.log('=====================================');
            console.log(`🚀 Server running at http://localhost:${port}`);
            console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Database: PostgreSQL`);
            console.log('=====================================');
            console.log('⚠️  WARNING: This app contains intentional vulnerabilities for training!');
        });
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
