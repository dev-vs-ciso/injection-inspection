/**
 * AI routes - equivalent to Python application/ai.py
 */

import { Router, Request, Response } from 'express';
import { requireActiveUser } from '../middleware';

export const aiRouter = Router();

// AI Loan Advisor
aiRouter.get('/loan-advisor', requireActiveUser, (req: Request, res: Response) => {
    res.render('ai_loan_advisor', { user: req.user });
});

aiRouter.post('/loan-advisor', requireActiveUser, (req: Request, res: Response) => {
    // Placeholder - AI processing would go here
    req.flash('info', 'AI Loan Advisor feature (placeholder)');
    res.redirect('/ai/loan-advisor');
});

// AI Research
aiRouter.get('/research', requireActiveUser, (req: Request, res: Response) => {
    res.render('ai_research', { user: req.user });
});

aiRouter.post('/research', requireActiveUser, (req: Request, res: Response) => {
    // Placeholder - AI processing would go here
    req.flash('info', 'AI Research feature (placeholder)');
    res.redirect('/ai/research');
});
