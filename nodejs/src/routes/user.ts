/**
 * User routes for authentication and profile management
 * Handles login, logout, profile, and preferences functionality
 */
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { AppDataSource } from '../database';
import { anonymousRequired, activeUserRequired, rateLimitLogin, addLoginAttempt } from '../middleware/auth';

const router = Router();

// Login page and authentication handler
router.get('/login', anonymousRequired, (req: Request, res: Response) => {
    res.render('login', {
        title: 'Login',
        errors: []
    });
});

router.post('/login',
    anonymousRequired,
    rateLimitLogin(5, 15),
    [
        body('email').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.render('login', {
                    title: 'Login',
                    errors: errors.array()
                });
            }

            const { email, password, remember_me } = req.body;

            // Use vulnerable authentication by default
            // The secure method User.standardLoginCheck() exists but is not used
            const user = await vulnerableLoginCheck(email, password);

            if (user) {
                if (!user.isActive) {
                    return res.render('login', {
                        title: 'Login',
                        errors: [{ msg: 'Your account has been deactivated. Please contact support.' }]
                    });
                }

                // Login successful
                (req.session as any).userId = user.id;
                
                // Set longer session if remember me is checked
                if (remember_me) {
                    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                }

                // Redirect to intended page or dashboard
                const nextUrl = (req.session as any).nextUrl || '/dashboard';
                (req.session as any).nextUrl = undefined;
                
                return res.redirect(nextUrl);
            } else {
                // Record failed login attempt
                addLoginAttempt(req, res, () => {});
                
                return res.render('login', {
                    title: 'Login',
                    errors: [{ msg: 'Invalid email or password.' }]
                });
            }
        } catch (error: any) {
            console.error('Login error:', error);
            return res.render('login', {
                title: 'Login',
                errors: [{ msg: `Database error: ${error.message}` }]
            });
        }
    }
);

async function standardLoginCheck(email: string, password: string): Promise<User | null> {
    /**
     * SECURE: Standard login method using TypeORM
     * This is the SAFE implementation that should be used in production
     * Protected against SQL injection attacks
     * NOTE: This function exists but is NOT currently used by the login route
     */
    return await User.standardLoginCheck(email, password);
}

async function vulnerableLoginCheck(email: string, password: string): Promise<User | null> {
    /**
     * EXTREMELY VULNERABLE: Default login method using User class vulnerable method
     * THIS IS THE ACTIVE AUTHENTICATION METHOD - Contains severe SQL injection vulnerabilities
     * 
     * Critical SQL Injection Test Cases:
     * - Email: ' OR '1'='1' --    (Login as first user, any password)
     * - Email: ' OR 1=1 --        (Login as first user, any password)  
     * - Email: admin' --          (Login as admin if exists, any password)
     * - Email: ' OR '1'='1        (Login without password, no comment needed)
     * - Password: anything        (Password is completely ignored in vulnerable method)
     */
    try {
        // Use the vulnerable authentication method from User class
        // This method contains SQL injection vulnerabilities and bypasses password validation
        const user = await User.authenticate(email, password);

        if (user) {
            console.log(`Login successful for user: ${user.email}`);
            return user;
        }
        
        return null;
        
    } catch (error) {
        // Show SQL errors for training purposes
        console.error('Database error:', error);
        throw error;
    }
}

// Logout handler
router.get('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/');
    });
});

// User profile page
router.get('/profile', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        
        // Get user's transaction statistics
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const transactionCount = await transactionRepo.count({ where: { userId: user.id } });
        
        const firstTransaction = await transactionRepo.findOne({
            where: { userId: user.id },
            order: { date: 'ASC' }
        });
        
        const lastTransaction = await transactionRepo.findOne({
            where: { userId: user.id },
            order: { date: 'DESC' }
        });
        
        const accountAgeMs = Date.now() - user.createdAt.getTime();
        const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
        
        const profileStats = {
            transactionCount,
            firstTransactionDate: firstTransaction?.date || null,
            lastTransactionDate: lastTransaction?.date || null,
            accountAge: accountAgeDays
        };
        
        res.render('profile', {
            title: 'Profile',
            profileStats
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading profile information.'
        });
    }
});

// User preferences page with vulnerable JSON evaluation
router.get('/preferences', activeUserRequired, (req: Request, res: Response) => {
    // Load current preferences and evaluate any formulas
    const customConfig = (req.session as any).customConfig || {};
    const standardPreferences = (req.session as any).standardPreferences || {};
    
    // VULNERABILITY: Re-evaluate formulas on page load
    if (customConfig && customConfig.formulas) {
        for (const [key, formula] of Object.entries(customConfig.formulas)) {
            try {
                // VULNERABLE: eval() during page rendering
                const result = eval(formula as string);
                customConfig[`${key}_current`] = result;
            } catch (error) {
                // Ignore eval errors
            }
        }
    }
    
    res.render('preferences', {
        title: 'Preferences',
        customConfig: JSON.stringify(customConfig, null, 2),
        standardPreferences
    });
});

router.post('/preferences', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const { dashboard_layout, theme, widgets, custom_config } = req.body;
        
        if (custom_config) {
            try {
                // VULNERABLE: JSON with formula evaluation
                console.log(`DEBUG: Processing custom configuration: ${custom_config.substring(0, 100)}...`);
                
                // Parse JSON configuration
                const configData = JSON.parse(custom_config);
                
                // Process any "formula" fields - VULNERABLE to code injection
                if (configData.formulas) {
                    for (const [key, formula] of Object.entries(configData.formulas)) {
                        try {
                            // VULNERABLE: Direct eval() of user input
                            const result = eval(formula as string);
                            configData[`${key}_result`] = result;
                            console.log(`DEBUG: Evaluated formula ${key}: ${formula} = ${result}`);
                        } catch (error) {
                            console.log(`Formula error in ${key}: ${error}`);
                        }
                    }
                }
                
                // Process "calculations" for dashboard widgets
                if (configData.calculations) {
                    for (const [calcName, expression] of Object.entries(configData.calculations)) {
                        try {
                            // VULNERABLE: Another eval() point
                            const calculatedValue = eval(expression as string);
                            configData[`calc_${calcName}`] = calculatedValue;
                        } catch (error) {
                            console.log(`Calculation error in ${calcName}: ${error}`);
                        }
                    }
                }
                
                // Store the processed configuration
                (req.session as any).customConfig = configData;
                
                res.redirect('/preferences?message=Custom configuration applied');
                
            } catch (jsonError) {
                res.redirect('/preferences?error=Invalid JSON format in custom configuration');
            }
        } else {
            // Standard preferences (safe)
            const preferences = {
                dashboard_layout: dashboard_layout || 'default',
                theme: theme || 'light',
                widgets: Array.isArray(widgets) ? widgets : [widgets].filter(Boolean)
            };
            (req.session as any).standardPreferences = preferences;
            res.redirect('/preferences?message=Preferences updated successfully');
        }
    } catch (error) {
        console.error('Preferences error:', error);
        res.redirect('/preferences?error=Error updating preferences');
    }
});

export default router;