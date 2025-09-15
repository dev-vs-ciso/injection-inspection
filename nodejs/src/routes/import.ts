/**
 * Import/Export routes for the banking application
 * Handles data import and export functionality with various vulnerable formats
 */
import { Router, Request, Response } from 'express';
import { activeUserRequired } from '../middleware/auth';
import { AppDataSource } from '../database';
import { Transaction, User } from '../models';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

// Extend Request interface to include file
declare global {
    namespace Express {
        interface Request {
            file?: Express.Multer.File;
        }
    }
}

const router = Router();

// Export file generation function
async function generateExportFile(filename: string, dateRange: string, userId: number) {
    try {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(dateRange));

        // Query transactions
        const transactions = await transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.user_id = :userId', { userId })
            .andWhere('transaction.date >= :startDate', { startDate })
            .andWhere('transaction.date <= :endDate', { endDate })
            .orderBy('transaction.date', 'DESC')
            .getMany();

        // Ensure exports directory exists
        const exportsDir = 'exports';
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
        }

        // Generate CSV content
        const csvHeaders = 'Date,Description,Company,Amount,Balance,Type\n';
        const csvRows = transactions.map(t => {
            return `${t.date.toISOString().split('T')[0]},"${t.description}","${t.company}",${t.amount},${t.balanceAfter},${t.transactionType}`;
        }).join('\n');

        const csvContent = csvHeaders + csvRows;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const csvFilename = `${filename}_${timestamp}.csv`;
        const filePath = path.join(exportsDir, csvFilename);

        // Write file
        fs.writeFileSync(filePath, csvContent);

        return {
            success: true,
            transactionCount: transactions.length,
            filename: csvFilename,
            fileExists: fs.existsSync(filePath),
            dateRange: dateRange
        };

    } catch (error) {
        console.error('Export generation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            transactionCount: 0,
            filename: '',
            fileExists: false
        };
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
        // Accept various file types for import
        const allowedTypes = ['.csv', '.json', '.yaml', '.yml', '.py', '.txt'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported types: CSV, JSON, YAML, Python scripts, and text files.'));
        }
    }
});

// Import page - show the import form
router.get('/import', activeUserRequired, async (req: Request, res: Response) => {
    try {
        res.render('import', {
            title: 'Import Transactions',
            user: req.user
        });
    } catch (error) {
        console.error('Import page error:', error);
        res.status(500).render('error', {
            title: 'Import Error',
            message: 'Error loading import page.'
        });
    }
});

// Handle file upload and processing
router.post('/import', activeUserRequired, upload.single('import_file'), async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const file = req.file;
        const importFormat = req.body.import_format;

        if (!file) {
            return res.status(400).render('error', {
                title: 'Import Error',
                message: 'No file uploaded.',
                user: req.user
            });
        }

        let result;
        
        try {
            // Process file based on format
            switch (importFormat) {
                case 'standard':
                    result = await processStandardCSV(file.path, user.id);
                    break;
                case 'yaml_config':
                    result = await processYAMLConfig(file.path, user.id);
                    break;
                case 'json_template':
                    result = await processJSONTemplate(file.path, user.id);
                    break;
                case 'config_script':
                    result = await processConfigScript(file.path, user.id);
                    break;
                default:
                    throw new Error('Unsupported import format');
            }

            // Clean up uploaded file
            fs.unlinkSync(file.path);

            res.render('import_result', {
                title: 'Import Complete',
                user: req.user,
                result: result,
                success: true
            });

        } catch (processError: any) {
            // Clean up uploaded file on error
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            
            console.error('File processing error:', processError);
            res.status(400).render('import_result', {
                title: 'Import Failed',
                user: req.user,
                result: {
                    error: processError?.message || 'Unknown error occurred',
                    imported_count: 0,
                    failed_count: 1
                },
                success: false
            });
        }

    } catch (error) {
        console.error('Import route error:', error);
        res.status(500).render('error', {
            title: 'Import Error',
            message: 'Error processing import request.',
            user: req.user
        });
    }
});

// Export page - show export options
router.get('/export', activeUserRequired, async (req: Request, res: Response) => {
    try {
        res.render('export', {
            title: 'Export Transactions',
            user: req.user,
            filename: null,
            dateRange: null
        });
    } catch (error) {
        console.error('Export page error:', error);
        res.status(500).render('error', {
            title: 'Export Error',
            message: 'Error loading export page.'
        });
    }
});

// Handle export form submission
router.post('/export', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const filename = req.body.filename || 'transactions';
        const dateRange = req.body.date_range || '30';

        // Generate export file
        const result = await generateExportFile(filename, dateRange, user.id);

        res.render('export', {
            title: 'Export Transactions',
            user: req.user,
            filename: filename,
            dateRange: dateRange,
            exportResults: result
        });

    } catch (error) {
        console.error('Export processing error:', error);
        res.render('export', {
            title: 'Export Transactions',
            user: req.user,
            filename: req.body.filename || null,
            dateRange: req.body.date_range || null,
            exportResults: {
                success: false,
                error: 'Export processing failed',
                transactionCount: 0,
                filename: '',
                fileExists: false
            }
        });
    }
});

// Download exported file
router.get('/download/:filename', activeUserRequired, async (req: Request, res: Response) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join('exports', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).render('error', {
                title: 'File Not Found',
                message: 'The requested export file was not found.',
                user: req.user
            });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/csv');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Clean up file after download (optional)
        fileStream.on('end', () => {
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }, 5000); // Delete after 5 seconds
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).render('error', {
            title: 'Download Error',
            message: 'Error downloading export file.',
            user: req.user
        });
    }
});

// Process standard CSV format
async function processStandardCSV(filePath: string, userId: number): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('Empty CSV file');
    }
    
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
        throw new Error('User not found');
    }
    
    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    // Skip header row if it exists
    const dataLines = lines[0].includes('Date') || lines[0].includes('Company') ? lines.slice(1) : lines;
    
    for (const line of dataLines) {
        try {
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            
            if (columns.length < 5) {
                failedCount++;
                errors.push(`Invalid CSV format: ${line}`);
                continue;
            }
            
            const [dateStr, company, amountStr, type, description] = columns;
            
            const transaction = new Transaction();
            transaction.userId = userId;
            transaction.date = new Date(dateStr);
            transaction.company = company;
            transaction.amount = parseFloat(amountStr);
            transaction.transactionType = type.toLowerCase();
            transaction.description = description;
            transaction.referenceNumber = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            transaction.balanceAfter = user.balance + (type.toLowerCase() === 'credit' ? transaction.amount : -transaction.amount);
            
            await transactionRepo.save(transaction);
            importedCount++;
            
        } catch (error: any) {
            failedCount++;
            errors.push(`Error processing line: ${line} - ${error?.message || 'Unknown error'}`);
        }
    }
    
    return {
        imported_count: importedCount,
        failed_count: failedCount,
        errors: errors.slice(0, 10) // Limit errors shown
    };
}

// Process YAML configuration (VULNERABLE - allows object instantiation)
async function processYAMLConfig(filePath: string, userId: number): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
        // VULNERABLE: Using unsafe YAML loading that allows object instantiation
        const config = yaml.load(content) as any;
        
        let result: any = {
            imported_count: 0,
            failed_count: 0,
            config_processed: true,
            config_data: config
        };
        
        // Process configuration if it contains transaction data
        if (config.transactions && Array.isArray(config.transactions)) {
            const transactionRepo = AppDataSource.getRepository(Transaction);
            
            for (const txnData of config.transactions) {
                try {
                    const transaction = new Transaction();
                    transaction.userId = userId;
                    transaction.date = new Date(txnData.date);
                    transaction.company = txnData.company;
                    transaction.amount = parseFloat(txnData.amount);
                    transaction.transactionType = txnData.type;
                    transaction.description = txnData.description || '';
                    transaction.referenceNumber = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                    transaction.balanceAfter = txnData.balance_after || 0;
                    
                    await transactionRepo.save(transaction);
                    result.imported_count++;
                } catch (error) {
                    result.failed_count++;
                }
            }
        }
        
        // Execute any processor if defined (VULNERABLE)
        if (config.processor && typeof config.processor === 'function') {
            try {
                const processorResult = config.processor(config);
                result.processor_result = processorResult;
            } catch (error: any) {
                result.processor_error = error?.message || 'Processor execution failed';
            }
        }
        
        return result;
        
    } catch (error: any) {
        throw new Error(`YAML processing error: ${error?.message || 'Unknown YAML error'}`);
    }
}

// Process JSON template with formulas (VULNERABLE - allows code execution)
async function processJSONTemplate(filePath: string, userId: number): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
        const template = JSON.parse(content);
        
        let result: any = {
            imported_count: 0,
            failed_count: 0,
            template_processed: true,
            formulas_executed: []
        };
        
        // Execute preprocessing commands (VULNERABLE)
        if (template.preprocessing && Array.isArray(template.preprocessing)) {
            for (const cmd of template.preprocessing) {
                try {
                    if (cmd.command) {
                        // VULNERABLE: Direct evaluation of user-provided code
                        const cmdResult = eval(cmd.command);
                        result.formulas_executed.push({
                            command: cmd.command,
                            result: cmdResult
                        });
                    }
                } catch (error: any) {
                    result.formulas_executed.push({
                        command: cmd.command,
                        error: error?.message || 'Command execution failed'
                    });
                }
            }
        }
        
        // Execute formulas (VULNERABLE)
        if (template.formulas && typeof template.formulas === 'object') {
            for (const [key, formula] of Object.entries(template.formulas)) {
                try {
                    // VULNERABLE: Direct evaluation of user-provided formulas
                    const formulaResult = eval(formula as string);
                    result.formulas_executed.push({
                        formula: `${key} = ${formula}`,
                        result: formulaResult
                    });
                } catch (error: any) {
                    result.formulas_executed.push({
                        formula: `${key} = ${formula}`,
                        error: error?.message || 'Formula execution failed'
                    });
                }
            }
        }
        
        return result;
        
    } catch (error: any) {
        throw new Error(`JSON template processing error: ${error?.message || 'Unknown JSON error'}`);
    }
}

// Process configuration script (VULNERABLE - allows arbitrary code execution)
async function processConfigScript(filePath: string, userId: number): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
        // VULNERABLE: Direct execution of user-provided Python/JavaScript code
        // This is extremely dangerous and would allow arbitrary code execution
        
        let result = {
            imported_count: 0,
            failed_count: 0,
            script_processed: true,
            execution_result: "Script execution not implemented (security consideration)",
            script_content_preview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        };
        
        // In a real vulnerable implementation, this would execute the script
        // For demonstration purposes, we'll just show that it would be processed
        
        // Simulate some processing
        const lines = content.split('\n').length;
        result.execution_result = `Script would have executed ${lines} lines of code with full system privileges`;
        
        return result;
        
    } catch (error: any) {
        throw new Error(`Configuration script processing error: ${error?.message || 'Unknown script error'}`);
    }
}

export default router;