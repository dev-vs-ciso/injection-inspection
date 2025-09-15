// Type definitions for session data
import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        nextUrl?: string;
        loginAttempts?: string[];
        customConfig?: any;
        standardPreferences?: any;
    }
}