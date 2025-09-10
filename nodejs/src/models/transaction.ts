/**
 * Transaction model - TypeORM equivalent of Python SQLAlchemy Transaction model
 */

import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';
import { IsNotEmpty, IsDecimal, IsIn } from 'class-validator';
import { User } from './user';

@Entity('transactions')
@Index(['userId'])
@Index(['date'])
@Index(['transactionType'])
export class Transaction {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    @IsDecimal()
    amount!: number;

    @Column({ length: 100 })
    @IsNotEmpty()
    company!: string;

    @Column({ name: 'transaction_type', length: 10 })
    @IsIn(['credit', 'debit'])
    transactionType!: 'credit' | 'debit';

    @Column({ length: 50, nullable: true })
    category?: string;

    @Column({ length: 255, nullable: true })
    description?: string;

    @Column({ name: 'reference_number', unique: true, length: 20 })
    referenceNumber!: string;

    @CreateDateColumn({ name: 'date', type: 'timestamp' })
    date!: Date;

    // Relationships
    @ManyToOne(() => User, user => user.transactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    /**
     * Generate unique reference number
     */
    static generateReferenceNumber(): string {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
        return `TXN${timestamp}${random}`;
    }
}
