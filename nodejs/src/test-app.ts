/**
 * Simple test app without database for TypeScript testing
 */
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { User } from './models/User';

// Type declarations
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

const app = express();

// Test route to verify types work
app.get('/test', (req: Request, res: Response) => {
    // This should not cause TypeScript error
    const user = req.user;
    
    res.json({
        message: 'TypeScript compilation test successful!',
        hasUser: !!user,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req: Request, res: Response) => {
    res.send(`
        <h1>Banking App TypeScript Test</h1>
        <p>If you can see this page, TypeScript compilation is working!</p>
        <p><a href="/test">Test API endpoint</a></p>
        <p><strong>Next:</strong> Set up PostgreSQL database and run the full app.</p>
    `);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`🚀 Test server running on port ${port}`);
    console.log(`📝 TypeScript compilation successful!`);
    console.log(`🔗 Visit: http://localhost:${port}`);
    console.log('');
    console.log('✅ This confirms the TypeScript architecture is working');
    console.log('📋 Next step: Set up PostgreSQL and run the full banking app');
});

export default app;