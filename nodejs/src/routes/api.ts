/**
 * API routes - equivalent to Python application/api.py
 */

import { Router, Request, Response } from 'express';
import { getDatabaseStats } from '../config/database';

export const apiRouter = Router();

// API Statistics endpoint
apiRouter.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await getDatabaseStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('API stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics'
        });
    }
});

// API Transactions endpoint  
apiRouter.post('/transactions', (req: Request, res: Response) => {
    // Placeholder - to be implemented
    res.json({
        success: true,
        data: [],
        message: 'Transactions API endpoint (placeholder)'
    });
});
