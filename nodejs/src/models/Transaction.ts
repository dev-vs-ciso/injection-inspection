import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from './User';
import { AppDataSource } from '../database';

@Entity('transactions')
@Index(['userId'])
@Index(['date'])
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @Column({ name: 'transaction_type', type: 'varchar', length: 20 })
    transactionType: string; // 'debit' or 'credit'

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 100 })
    company: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamp' })
    date: Date;

    @Column({ name: 'reference_number', unique: true, type: 'varchar', length: 50 })
    referenceNumber: string;

    @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
    balanceAfter: number;

    @Column({ type: 'varchar', length: 30, nullable: true })
    category: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    // Relationships
    @ManyToOne(() => User, user => user.transactions)
    @JoinColumn({ name: 'user_id' })
    user: User;

    // Instance methods
    formatAmount(): string {
        return `$${this.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    isDebit(): boolean {
        return this.transactionType === 'debit';
    }

    isCredit(): boolean {
        return this.transactionType === 'credit';
    }

    // Static methods
    static async getTotalVolume(): Promise<number> {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const result = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .getRawOne();
        
        return parseFloat(result?.total || '0');
    }

    static async getTransactionCount(): Promise<number> {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        return await transactionRepo.count();
    }

    static async getMonthlyVolume(): Promise<number> {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const transactionRepo = AppDataSource.getRepository(Transaction);
        const result = await transactionRepo
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.date >= :currentMonth', { currentMonth })
            .getRawOne();
        
        return parseFloat(result?.total || '0');
    }
}