/**
 * Configuration settings for Banking Application
 * Node.js equivalent of Python config.py
 * PostgreSQL database only
 */

import { DataSourceOptions } from "typeorm";

export class Config {
    // Flask equivalent settings
    public readonly SECRET_KEY: string;
    public readonly SESSION_TIMEOUT: number;
    public readonly BANK_NAME: string;
    public readonly TRANSACTIONS_PER_PAGE: number;

    // Database configuration (PostgreSQL only)
    public readonly DATABASE_HOST: string;
    public readonly DATABASE_PORT: number;
    public readonly DATABASE_NAME: string;
    public readonly DATABASE_USER: string;
    public readonly DATABASE_PASSWORD: string;
    public readonly DATABASE_URL: string;

    // Session security settings
    public readonly SESSION_COOKIE_SECURE: boolean;
    public readonly SESSION_COOKIE_HTTPONLY: boolean;
    public readonly SESSION_COOKIE_SAMESITE: boolean | 'lax' | 'strict' | 'none';

    // Edge computing settings (matching Python version)
    public readonly EDGE_MODE: boolean;
    public readonly EDGE_CACHE_TIMEOUT: number;

    // LLM Configuration (matching Python version)
    public readonly LLM_SERVICE_URL: string;
    public readonly LLM_MODEL: string;

    constructor() {
        // Flask equivalent settings
        this.SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-for-development-only';
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.BANK_NAME = process.env.BANK_NAME || 'Kerata-Zemke';
        this.TRANSACTIONS_PER_PAGE = parseInt(process.env.TRANSACTIONS_PER_PAGE || '20');

        // Database configuration (PostgreSQL only)
        this.DATABASE_HOST = process.env.DB_HOST || 'localhost';
        this.DATABASE_PORT = parseInt(process.env.DB_PORT || '5432');
        this.DATABASE_NAME = process.env.DB_NAME || 'banking';
        this.DATABASE_USER = process.env.DB_USER || 'bankuser';
        this.DATABASE_PASSWORD = process.env.DB_PASS || 'securepassword123';

        // Build PostgreSQL database URL
        this.DATABASE_URL = `postgres://${this.DATABASE_USER}:${this.DATABASE_PASSWORD}@${this.DATABASE_HOST}:${this.DATABASE_PORT}/${this.DATABASE_NAME}`;

        // Session security (matching Flask settings)
        this.SESSION_COOKIE_SECURE = process.env.LOCAL_TEST === 'True' ? false : true;
        this.SESSION_COOKIE_HTTPONLY = true;
        this.SESSION_COOKIE_SAMESITE = 'lax';

        // Edge computing settings
        this.EDGE_MODE = process.env.EDGE_MODE?.toLowerCase() === 'true';
        this.EDGE_CACHE_TIMEOUT = parseInt(process.env.EDGE_CACHE_TIMEOUT || '300');

        // LLM Configuration
        this.LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:11434/api/generate';
        this.LLM_MODEL = process.env.LLM_MODEL || 'tinyllama';
    }

    /**
     * Get TypeORM connection options for PostgreSQL
     */
    public getTypeORMConfig(): DataSourceOptions {
        const baseConfig: Partial<DataSourceOptions> = {
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development' ? 'all' : false,
            entities: ['src/models/*.ts'],
            migrations: ['src/migrations/*.ts'],
        };

        return {
            ...baseConfig,
            type: 'postgres' as const,
            host: this.DATABASE_HOST,
            port: this.DATABASE_PORT,
            username: this.DATABASE_USER,
            password: this.DATABASE_PASSWORD,
            database: this.DATABASE_NAME,
        } as DataSourceOptions;
    }
}
