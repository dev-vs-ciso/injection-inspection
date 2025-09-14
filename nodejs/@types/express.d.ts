declare module 'express-session' {
    interface SessionData {
        userId?: number;
        nextUrl?: string;
        loginAttempts?: string[];
        standardPreferences?: any;
        customConfig?: any;
    }
}

declare global {
    namespace Express {
        interface Request {
            user?: any; // Using any to avoid circular import issues
        }
    }
}