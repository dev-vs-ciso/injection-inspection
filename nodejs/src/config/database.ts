/**
 * Database configuration using TypeORM
 * Equivalent to SQLAlchemy setup in Python version
 */

import { DataSource } from 'typeorm';
import { Config } from './config';

const config = new Config();

export const AppDataSource = new DataSource({
    ...config.getTypeORMConfig()
});

/**
 * Initialize database connection
 * Equivalent to init_database() in Python models.py
 */
export async function initializeDatabase(): Promise<void> {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connection initialized successfully');
        
        // Run migrations in production, sync in development
        if (process.env.NODE_ENV === 'production') {
            await AppDataSource.runMigrations();
            console.log('✅ Database migrations completed');
        }
        
    } catch (error) {
        console.error('❌ Error during database initialization:', error);
        throw error;
    }
}

/**
 * Get database statistics
 * Equivalent to get_database_stats() in Python models.py
 */
export async function getDatabaseStats() {
    if (!AppDataSource.isInitialized) {
        throw new Error('Database not initialized');
    }

    try {
        const userRepo = AppDataSource.getRepository('User');
        const transactionRepo = AppDataSource.getRepository('Transaction');
        
        // Get basic counts
        const totalUsers = await userRepo.count();
        const totalTransactions = await transactionRepo.count();
        
        // Get total volume (sum of all transaction amounts)
        const volumeResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .getRawOne();
        const totalVolume = parseFloat(volumeResult?.total || '0');
        
        // Get monthly volume (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlyResult = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.date >= :thirtyDaysAgo', { thirtyDaysAgo })
            .getRawOne();
        const monthlyVolume = parseFloat(monthlyResult?.total || '0');
        
        return {
            total_users: totalUsers,
            total_transactions: totalTransactions,
            total_volume: totalVolume,
            monthly_volume: monthlyVolume
        };
        
    } catch (error) {
        console.error('Error getting database stats:', error);
        return {
            total_users: 0,
            total_transactions: 0,
            total_volume: 0,
            monthly_volume: 0
        };
    }
}
