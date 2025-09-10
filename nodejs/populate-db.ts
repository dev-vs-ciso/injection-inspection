/**
 * Database population script for Node.js application
 * Equivalent to Python populate_db.py
 */

import 'reflect-metadata';
import * as faker from 'faker';
import * as crypto from 'crypto';
import { AppDataSource } from './src/config/database';
import { User } from './src/models/User';
import { Transaction } from './src/models/transaction';
import { Feedback } from './src/models/feedback';

/**
 * Hash password using MD5 (intentionally weak for security training)
 */
function hashPassword(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
}

/**
 * Generate sample users
 */
async function createUsers(count: number = 35): Promise<User[]> {
    console.log(`Creating ${count} users...`);
    const users: User[] = [];
    
    // Create admin user
    const admin = new User();
    admin.firstName = 'Admin';
    admin.lastName = 'User';
    admin.email = 'admin@injectibank.com';
    admin.passwordHash = hashPassword('admin123');
    admin.role = 'admin';
    admin.accountNumber = 'ADM' + Date.now().toString().slice(-10);
    admin.balance = 50000;
    admin.isActive = true;
    users.push(admin);
    
    // Create test user
    const testUser = new User();
    testUser.firstName = 'Test';
    testUser.lastName = 'User';
    testUser.email = 'test@example.com';
    testUser.passwordHash = hashPassword('password');
    testUser.role = 'customer';
    testUser.accountNumber = 'TST' + Date.now().toString().slice(-10);
    testUser.balance = 5000;
    testUser.isActive = true;
    users.push(testUser);
    
    // Create regular users
    for (let i = 0; i < count - 2; i++) {
        const user = new User();
        user.firstName = faker.person.firstName();
        user.lastName = faker.person.lastName();
        user.email = faker.internet.email({ firstName: user.firstName, lastName: user.lastName });
        user.passwordHash = hashPassword('password123');
        user.role = 'customer';
        user.accountNumber = 'USR' + (Date.now() + i).toString().slice(-10);
        user.balance = faker.number.float({ min: 100, max: 25000, fractionDigits: 2 });
        user.isActive = faker.datatype.boolean({ probability: 0.95 });
        users.push(user);
    }
    
    return users;
}

/**
 * Generate transactions for a user
 */
async function createTransactionsForUser(user: User, count: number = 75): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    let runningBalance = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });
    
    const categories = ['Food', 'Gas', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Travel', 'Other'];
    const companies = [
        'Amazon', 'Walmart', 'Target', 'Shell', 'Exxon', 'McDonald\'s', 'Starbucks',
        'Netflix', 'Spotify', 'AT&T', 'Verizon', 'Electric Company', 'Gas Company',
        'CVS Pharmacy', 'Walgreens', 'Home Depot', 'Lowe\'s', 'Best Buy'
    ];
    
    // Generate transactions over the past 6 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    for (let i = 0; i < count; i++) {
        const transaction = new Transaction();
        transaction.user = user;
        transaction.date = faker.date.between({ from: startDate, to: new Date() });
        transaction.company = faker.helpers.arrayElement(companies);
        transaction.category = faker.helpers.arrayElement(categories);
        transaction.description = `${transaction.company} ${faker.lorem.words(3)}`;
        
        // Mix of positive and negative amounts
        const isDebit = faker.datatype.boolean({ probability: 0.7 });
        transaction.amount = isDebit ? 
            -faker.number.float({ min: 5, max: 500, fractionDigits: 2 }) :
            faker.number.float({ min: 100, max: 2000, fractionDigits: 2 });
        
        runningBalance += transaction.amount;
        transaction.balance = Math.round(runningBalance * 100) / 100;
        
        transactions.push(transaction);
    }
    
    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return transactions;
}

/**
 * Generate feedback entries
 */
async function createFeedback(users: User[], count: number = 25): Promise<Feedback[]> {
    const feedback: Feedback[] = [];
    const categories = ['Bug Report', 'Feature Request', 'General Feedback', 'Complaint', 'Compliment'];
    const messages = [
        'The search function is very slow when looking for specific transactions.',
        'It would be great to have mobile banking app.',
        'Love the new interface design! Very clean and modern.',
        'Having trouble with password reset functionality.',
        'The export feature doesn\'t include all my transaction data.',
        'Customer service has been excellent lately.',
        'Website loads slowly during peak hours.',
        'Would like to see budgeting tools integrated.'
    ];
    
    for (let i = 0; i < count; i++) {
        const feedbackItem = new Feedback();
        feedbackItem.user = faker.helpers.arrayElement(users);
        feedbackItem.category = faker.helpers.arrayElement(categories);
        feedbackItem.message = faker.helpers.arrayElement(messages);
        feedbackItem.anonymous = faker.datatype.boolean({ probability: 0.3 });
        feedbackItem.submitted_at = faker.date.past({ years: 1 });
        feedback.push(feedbackItem);
    }
    
    return feedback;
}

/**
 * Main population function
 */
async function populateDatabase(): Promise<void> {
    console.log('🚀 Starting database population...');
    
    try {
        // Initialize database connection
        await AppDataSource.initialize();
        
        // Drop and recreate schema for fresh start
        await AppDataSource.dropDatabase();
        await AppDataSource.synchronize();
        
        console.log('✅ Database connection established');
        
        // Create users
        const users = await createUsers();
        await AppDataSource.manager.save(User, users);
        console.log(`✅ Created ${users.length} users`);
        
        // Create transactions for each user
        let totalTransactions = 0;
        for (const user of users) {
            const userTransactions = await createTransactionsForUser(user);
            await AppDataSource.manager.save(Transaction, userTransactions);
            totalTransactions += userTransactions.length;
        }
        console.log(`✅ Created ${totalTransactions} transactions`);
        
        // Create feedback
        const feedback = await createFeedback(users);
        await AppDataSource.manager.save(Feedback, feedback);
        console.log(`✅ Created ${feedback.length} feedback entries`);
        
        console.log('\n🎉 Database population completed successfully!');
        console.log('\n📧 Test Credentials:');
        console.log('Admin: admin@injectibank.com / admin123');
        console.log('Test User: test@example.com / password');
        console.log('All other users: [email] / password123');
        console.log('\n🔐 SQL Injection Test:');
        console.log("Email: ' OR '1'='1' --");
        console.log('Password: (anything)');
        
        await AppDataSource.destroy();
        
    } catch (error) {
        console.error('❌ Database population failed:', error);
        process.exit(1);
    }
}

// Run the population script
if (require.main === module) {
    populateDatabase().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { populateDatabase };
