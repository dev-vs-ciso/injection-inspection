/**
 * Configuration settings for the Banking Application
 * PostgreSQL-only database configuration
 */
import dotenv from 'dotenv';

dotenv.config();

export interface Config {
    // Database settings
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    
    // Application settings
    app: {
        port: number;
        nodeEnv: string;
        bankName: string;
        transactionsPerPage: number;
    };
    
    // Security settings
    security: {
        secretKey: string;
        sessionSecret: string;
        sessionTimeout: number; // minutes
        isLocalTest: boolean;
    };
}

export const config: Config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'password',
        database: process.env.DB_NAME || 'banking'
    },
    
    app: {
        port: parseInt(process.env.PORT || '3000'),
        nodeEnv: process.env.NODE_ENV || 'development',
        bankName: process.env.BANK_NAME || 'Kerata-Zemke',
        transactionsPerPage: 20
    },
    
    security: {
        secretKey: process.env.SECRET_KEY || 'your-secret-key-for-development-only',
        sessionSecret: process.env.SESSION_SECRET || 'session-secret-key-change-in-production',
        sessionTimeout: 30, // 30 minutes
        isLocalTest: process.env.LOCAL_TEST === 'true'
    }
};