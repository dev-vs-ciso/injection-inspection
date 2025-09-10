/**
 * Feedback routes - equivalent to Python application/feedback.py
 */

import { Router, Request, Response } from 'express';
import { requireActiveUser } from '../middleware';

export const feedbackRouter = Router();

// Placeholder routes - to be implemented
feedbackRouter.get('/', requireActiveUser, (req: Request, res: Response) => {
    res.render('feedback_list', { user: req.user });
});

feedbackRouter.get('/:id', requireActiveUser, (req: Request, res: Response) => {
    res.render('feedback_detail', { user: req.user });
});

feedbackRouter.get('/submit', requireActiveUser, (req: Request, res: Response) => {
    res.render('submit_feedback', { user: req.user });
});

feedbackRouter.get('/user/:userId', requireActiveUser, (req: Request, res: Response) => {
    res.render('feedback_by_user', { user: req.user });
});
