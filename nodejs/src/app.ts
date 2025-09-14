/**
 * Main Express application for Banking Security Training
 * Node.js TypeScript port of the Flask application
 */
import 'reflect-metadata';
import express from 'express';
const session = require('express-session');
import path from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

import { config } from './config';
import { initializeDatabase } from './database';
import { errorHandler, notFoundHandler } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware (relaxed for training environment)
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for EJS templates with inline scripts
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: true,
    credentials: true
}));

// Logging middleware
if (config.app.nodeEnv === 'development') {
    app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
    secret: config.security.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: !config.security.isLocalTest, // HTTPS in production
        sameSite: 'lax',
        maxAge: config.security.sessionTimeout * 60 * 1000 // Convert minutes to milliseconds
    },
    name: 'banking.session'
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../src/views'));

// Template filters (equivalent to Flask template filters)
app.locals.currency = (value: number | null): string => {
    if (value === null || value === undefined) {
        return '$0.00';
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

app.locals.datetime = (value: Date | null, format: string = 'en-US'): string => {
    if (!value) {
        return '';
    }
    return value.toLocaleString(format);
};

// Global template variables (equivalent to Flask context processors)
app.use((req, res, next) => {
    res.locals.BANK_NAME = config.app.bankName;
    res.locals.user = req.user || null;
    next();
});

// Routes
import userRoutes from './routes/user';
import homeRoutes from './routes/home';
import transactionRoutes from './routes/transaction';
import feedbackRoutes from './routes/feedback';
import apiRoutes from './routes/api';
import importRoutes from './routes/import';
import aiRoutes from './routes/ai';

app.use('/', homeRoutes);
app.use('/', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/api', apiRoutes);
app.use('/', importRoutes);
app.use('/ai', aiRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
    try {
        // Initialize database connection
        await initializeDatabase();
        
        // Start the server
        const port = config.app.port;
        app.listen(port, '0.0.0.0', () => {
            console.log(`Banking Security Training App running on port ${port}`);
            console.log(`Environment: ${config.app.nodeEnv}`);
            console.log(`Database: PostgreSQL on ${config.database.host}:${config.database.port}`);
            console.log(`Bank: ${config.app.bankName}`);
            console.log('');
            console.log('SECURITY WARNING: This application contains intentional vulnerabilities for training purposes.');
            console.log('DO NOT USE IN PRODUCTION ENVIRONMENT.');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application only if this file is run directly
if (require.main === module) {
    startServer();
}

export default app;