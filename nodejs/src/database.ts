import { DataSource } from 'typeorm';
import { User } from './models/User';
import { Transaction } from './models/Transaction';
import { Feedback } from './models/Feedback';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'banking',
    synchronize: false, // Disabled - do not modify existing database schema
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Transaction, Feedback],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
    extra: {
        // Connection pool settings
        max: 20,
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 300000,
    }
});

export const initializeDatabase = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established successfully');
        console.log('Using existing database schema (synchronization disabled)');
    } catch (error) {
        console.error('Error during database initialization:', error);
        throw error;
    }
};

export const getDatabaseStats = async () => {
    const userRepo = AppDataSource.getRepository(User);
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const feedbackRepo = AppDataSource.getRepository(Feedback);

    const totalUsers = await userRepo.count();
    const totalTransactions = await transactionRepo.count();
    const totalFeedback = await feedbackRepo.count();
    
    // Get total volume
    const volumeResult = await transactionRepo
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .getRawOne();
    
    const totalVolume = parseFloat(volumeResult?.total || '0');
    
    // Get monthly volume (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyVolumeResult = await transactionRepo
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.date >= :currentMonth', { currentMonth })
        .getRawOne();
    
    const monthlyVolume = parseFloat(monthlyVolumeResult?.total || '0');
    
    // Get average feedback score
    const avgScoreResult = await feedbackRepo
        .createQueryBuilder('feedback')
        .select('AVG(feedback.score)', 'avg')
        .getRawOne();
    
    const averageScore = parseFloat(avgScoreResult?.avg || '0');
    
    return {
        totalUsers,
        totalTransactions,
        totalVolume,
        monthlyVolume,
        totalFeedback,
        averageScore: Math.round(averageScore * 10) / 10
    };
};