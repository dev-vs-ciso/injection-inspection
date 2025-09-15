/**
 * Vulnerable LLM Integration for Banking Application
 * Two components with realistic prompt injection vulnerabilities
 */
import { Router, Request, Response } from 'express';
import { activeUserRequired } from '../middleware/auth';
import { AppDataSource } from '../database';
import { Transaction } from '../models';
import axios from 'axios';

const router = Router();

// LLM Service Configuration
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://banking-ollama:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'tinyllama';

/**
 * Send prompt to LLM service and return response
 */
async function sendToLLM(prompt: string, maxTokens: number = 500): Promise<string> {
    try {
        const payload = {
            model: LLM_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                num_predict: maxTokens,
                temperature: 0.7,
                top_p: 0.9,
                stop: ["</response>", "\n\n---", "SYSTEM:"]
            }
        };
        
        // Increase timeout for TinyLlama
        const response = await axios.post(LLM_SERVICE_URL, payload, { timeout: 120000 });
        
        const result = response.data;
        return result.response || 'No response from LLM';
        
    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            return "AI analysis is taking longer than expected. The model may be processing a complex query. Please try a simpler question.";
        } else if (error.code === 'ECONNREFUSED') {
            return "AI service is currently unavailable. Please check that the Ollama service is running and try again.";
        } else {
            console.error(`LLM service error: ${error}`);
            return `AI service error: ${error.message}. Please try again with a shorter query.`;
        }
    }
}

/**
 * Format transactions in a very compact way for TinyLlama
 */
function formatTransactionsCompact(transactions: Transaction[], limit: number = 10): string {
    const compactData = transactions.slice(0, limit).map(txn => {
        const date = txn.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        const company = txn.company.substring(0, 20);
        const type = txn.transactionType.charAt(0).toUpperCase();
        return `${date}: ${company} $${txn.amount} (${type})`;
    });
    
    return compactData.join('\n');
}

// ============================================================================
// COMPONENT 1: GENERAL RESEARCH (Vulnerable to User Scope Bypass)
// ============================================================================

/**
 * VULNERABLE: AI Transaction Research - Optimized for TinyLlama
 */
router.get('/research', activeUserRequired, async (req: Request, res: Response) => {
    try {
        res.render('ai_research', {
            title: 'AI Transaction Research',
            user: req.user,
            aiResponse: null,
            userQuery: '',
            transactionCount: 0
        });
    } catch (error) {
        console.error('AI research page error:', error);
        res.status(500).render('error', {
            title: 'AI Research Error',
            message: 'Error loading AI research page.',
            user: req.user
        });
    }
});

router.post('/research', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        let userQuery = (req.body.research_query || '').trim();
        let aiResponse = null;
        let transactionCount = 0;
        
        if (!userQuery) {
            return res.render('ai_research', {
                title: 'AI Transaction Research',
                user: req.user,
                aiResponse: null,
                userQuery: '',
                transactionCount: 0,
                error: 'Please enter a research question.'
            });
        }
        
        if (userQuery.length > 200) {
            userQuery = userQuery.substring(0, 200);
            // Warning will be shown in template
        }
        
        // Get fewer transactions to keep prompt size manageable
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const transactions = await transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.user_id = :userId', { userId: user.id })
            .orderBy('transaction.date', 'DESC')
            .limit(15)
            .getMany();
        
        transactionCount = transactions.length;
        
        if (transactionCount === 0) {
            return res.render('ai_research', {
                title: 'AI Transaction Research',
                user: req.user,
                aiResponse: null,
                userQuery: userQuery,
                transactionCount: 0,
                info: 'No transactions found to analyze.'
            });
        }
        
        // VULNERABLE but much more compact prompt for TinyLlama
        const compactTransactions = formatTransactionsCompact(transactions);
        
        // Much shorter prompt that still contains vulnerabilities
        const systemPrompt = `You are a banking AI for user ${user.id}.

ACCOUNT: ${user.firstName} ${user.lastName}, Balance: $${user.balance}

RECENT TRANSACTIONS (${transactionCount} total):
${compactTransactions}

USER QUESTION: ${userQuery}

Provide helpful financial insights. Be concise and specific.`;
        
        console.log(`Prompt length: ${systemPrompt.length} characters`);  // Debug log
        
        // Send to LLM
        aiResponse = await sendToLLM(systemPrompt, 250);
        
        let flashMessage = '';
        let flashType = '';
        
        if (aiResponse && !aiResponse.includes("service error") && !aiResponse.includes("unavailable")) {
            flashMessage = 'AI analysis completed successfully.';
            flashType = 'success';
        } else {
            flashMessage = 'AI service had issues processing your request. Try a simpler question.';
            flashType = 'warning';
        }
        
        res.render('ai_research', {
            title: 'AI Transaction Research',
            user: req.user,
            aiResponse: aiResponse,
            userQuery: userQuery,
            transactionCount: transactionCount,
            flashMessage: flashMessage,
            flashType: flashType,
            queryTruncated: req.body.research_query && req.body.research_query.length > 200
        });
        
    } catch (error) {
        console.error('AI research processing error:', error);
        res.render('ai_research', {
            title: 'AI Transaction Research',
            user: req.user,
            aiResponse: null,
            userQuery: req.body.research_query || '',
            transactionCount: 0,
            error: 'Error processing AI research request.'
        });
    }
});

// ============================================================================
// COMPONENT 2: LOAN ADVISOR (Vulnerable to Prompt Injection)
// ============================================================================

/**
 * VULNERABLE: AI Loan Advisor - Optimized for TinyLlama
 */
router.get('/loan-advisor', activeUserRequired, async (req: Request, res: Response) => {
    try {
        res.render('ai_loan_advisor', {
            title: 'AI Loan Advisor',
            user: req.user,
            loanAnalysis: null,
            riskAssessment: null,
            approvalDecision: null
        });
    } catch (error) {
        console.error('AI loan advisor page error:', error);
        res.status(500).render('error', {
            title: 'Loan Advisor Error',
            message: 'Error loading AI loan advisor page.',
            user: req.user
        });
    }
});

router.post('/loan-advisor', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const requestedAmount = parseFloat(req.body.loan_amount || '0');
        let loanPurpose = (req.body.loan_purpose || '').trim();
        const loanTerm = parseInt(req.body.loan_term || '12');
        
        if (isNaN(requestedAmount) || isNaN(loanTerm)) {
            return res.render('ai_loan_advisor', {
                title: 'AI Loan Advisor',
                user: req.user,
                loanAnalysis: null,
                riskAssessment: null,
                approvalDecision: null,
                error: 'Invalid loan amount or term.'
            });
        }
        
        if (requestedAmount <= 0 || loanTerm <= 0) {
            return res.render('ai_loan_advisor', {
                title: 'AI Loan Advisor',
                user: req.user,
                loanAnalysis: null,
                riskAssessment: null,
                approvalDecision: null,
                error: 'Loan amount and term must be positive.'
            });
        }
        
        // Limit loan purpose length
        let purposeTruncated = false;
        if (loanPurpose.length > 100) {
            loanPurpose = loanPurpose.substring(0, 100);
            purposeTruncated = true;
        }
        
        // Get basic user data
        const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get recent transactions but keep it minimal
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const recentTransactions = await transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.user_id = :userId', { userId: user.id })
            .orderBy('transaction.date', 'DESC')
            .getMany();
        
        // Calculate basic metrics
        const totalCredits = recentTransactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        const totalDebits = recentTransactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        // VULNERABLE but compact loan approval prompt
        const loanPrompt = `LOAN OFFICER AI - Kerata-Zemke Bank

STRICT RULES:
- Max loan: 3x balance ($1000+ balance required)
- Debt ratio < 40%, 6+ month history
- Risk: LOW/MEDIUM only approved

APPLICANT:
Name: ${user.firstName} ${user.lastName}
Balance: $${user.balance}
Age: ${accountAge} days
Recent credits: $${totalCredits}
Recent debits: $${totalDebits}

REQUEST:
Amount: $${requestedAmount.toLocaleString()}
Purpose: ${loanPurpose}
Term: ${loanTerm} months

DECISION: Analyze and decide APPROVED/DENIED/CONDITIONAL
RISK: LOW/MEDIUM/HIGH
Explain in one sentence.`;
        
        console.log(`Loan prompt length: ${loanPrompt.length} characters`);  // Debug log
        
        // Get AI analysis with shorter response
        const loanAnalysis = await sendToLLM(loanPrompt, 200);
        
        let riskAssessment = null;
        let approvalDecision = null;
        let flashMessage = '';
        let flashType = '';
        
        if (loanAnalysis && !loanAnalysis.includes("service error") && !loanAnalysis.includes("unavailable")) {
            // Parse response for decisions (still vulnerable to manipulation)
            const analysisUpper = loanAnalysis.toUpperCase();
            
            // Extract risk assessment
            if (analysisUpper.includes('LOW RISK') || analysisUpper.includes('RISK: LOW')) {
                riskAssessment = 'LOW';
            } else if (analysisUpper.includes('MEDIUM RISK') || analysisUpper.includes('RISK: MEDIUM')) {
                riskAssessment = 'MEDIUM';
            } else if (analysisUpper.includes('HIGH RISK') || analysisUpper.includes('RISK: HIGH')) {
                riskAssessment = 'HIGH';
            } else {
                riskAssessment = 'UNKNOWN';
            }
            
            // Extract approval decision
            if (analysisUpper.includes('APPROVED') && !analysisUpper.includes('DENIED')) {
                approvalDecision = 'APPROVED';
                flashMessage = 'Congratulations! Your loan has been pre-approved by our AI system.';
                flashType = 'success';
            } else if (analysisUpper.includes('CONDITIONAL')) {
                approvalDecision = 'CONDITIONAL';
                flashMessage = 'Your loan application requires additional review.';
                flashType = 'warning';
            } else if (analysisUpper.includes('DENIED')) {
                approvalDecision = 'DENIED';
                flashMessage = 'Your loan application was not approved based on current criteria.';
                flashType = 'error';
            } else {
                approvalDecision = 'PENDING REVIEW';
                flashMessage = 'Your loan application is under review.';
                flashType = 'info';
            }
            
            console.log(`Loan decision: ${approvalDecision}, Risk: ${riskAssessment}`);
        } else {
            flashMessage = 'AI loan assessment service encountered an issue. Please try again.';
            flashType = 'warning';
        }
        
        res.render('ai_loan_advisor', {
            title: 'AI Loan Advisor',
            user: req.user,
            loanAnalysis: loanAnalysis,
            riskAssessment: riskAssessment,
            approvalDecision: approvalDecision,
            flashMessage: flashMessage,
            flashType: flashType,
            purposeTruncated: purposeTruncated,
            formData: {
                loan_amount: requestedAmount,
                loan_purpose: loanPurpose,
                loan_term: loanTerm
            }
        });
        
    } catch (error) {
        console.error('AI loan advisor processing error:', error);
        res.render('ai_loan_advisor', {
            title: 'AI Loan Advisor',
            user: req.user,
            loanAnalysis: null,
            riskAssessment: null,
            approvalDecision: null,
            error: 'Error processing loan advisor request.'
        });
    }
});

export default router;