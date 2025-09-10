/**
 * Type definitions for the banking application
 * Extends Express Request interface to include user session data
 */

import 'express-session';

declare global {
    namespace Express {
        interface Request {
            user?: import('@/models/user').User;
            isAuthenticated?: () => boolean;
        }
    }
}

declare module 'express-session' {
    interface SessionData {
        user?: import('@/models/user').User;
    }
}

export interface DatabaseStats {
    total_users: number;
    total_transactions: number;
    total_volume: number;
    monthly_volume: number;
}

export interface TransactionSearchParams {
    company?: string;
    amount_min?: number;
    amount_max?: number;
    date_from?: Date;
    date_to?: Date;
    transaction_type?: 'credit' | 'debit';
    reference?: string;
    category?: string;
}

export interface UserSummary {
    total_credits: number;
    total_debits: number;
    recent_activity_count: number;
    average_score: number;
}

export interface PaginationOptions {
    page: number;
    limit: number;
    offset: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface FlashMessage {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface ExportOptions {
    format: 'csv' | 'json' | 'xml';
    dateFrom?: Date;
    dateTo?: Date;
    includeHeaders?: boolean;
}

export interface ImportResult {
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
}

// LLM-related types (matching Python version)
export interface LLMRequest {
    prompt: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

export interface LLMResponse {
    response: string;
    model: string;
    created_at: Date;
}

// Security-related types for training purposes
export interface VulnerableQuery {
    query: string;
    params?: any[];
    vulnerability_type: 'sql_injection' | 'command_injection' | 'xss' | 'deserialization';
}
