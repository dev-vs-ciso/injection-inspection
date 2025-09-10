/**
 * User model - TypeORM equivalent of Python SQLAlchemy User model
 * Contains intentional vulnerabilities for security training
 */

import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn,
    OneToMany,
    Index
} from 'typeorm';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { Transaction } from './transaction';
import { Feedback } from './feedback';

@Entity('users')
@Index(['email'])
@Index(['accountNumber'])
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true, length: 120 })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @Column({ name: 'password_hash', length: 255 })
    @IsNotEmpty()
    @Length(6, 255)
    passwordHash!: string;

    @Column({ name: 'first_name', length: 50 })
    @IsNotEmpty()
    @Length(1, 50)
    firstName!: string;

    @Column({ name: 'last_name', length: 50 })
    @IsNotEmpty()
    @Length(1, 50)
    lastName!: string;

    @Column({ length: 20, default: 'customer' })
    role!: 'customer' | 'admin';

    @Column({ name: 'account_number', unique: true, length: 20 })
    accountNumber!: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 1000.00 })
    balance!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    // Relationships
    @OneToMany(() => Transaction, transaction => transaction.user, { cascade: true })
    transactions!: Transaction[];

    @OneToMany(() => Feedback, feedback => feedback.user, { cascade: true })
    feedback!: Feedback[];

    // Computed properties
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * VULNERABLE: Hash password using MD5 (intentionally weak for training)
     * DO NOT USE IN PRODUCTION - this demonstrates weak hashing
     */
    static hashPassword(password: string): string {
        // Using MD5 for demonstration purposes (VULNERABLE!)
        return crypto.createHash('md5').update(password).digest('hex');
    }

    /**
     * SECURE: Alternative password hashing method using bcrypt
     * This method exists but is not used by default to maintain vulnerabilities
     */
    static async hashPasswordSecure(password: string): Promise<string> {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * VULNERABLE: Authentication method with SQL injection vulnerabilities
     * This method demonstrates dangerous raw SQL usage for training purposes
     * DO NOT USE IN PRODUCTION
     */
    static async authenticate(email: string, password: string): Promise<User | null> {
        try {
            const passwordHash = this.hashPassword(password);
            
            // VULNERABLE: Direct SQL injection point for training
            const vulnerableQuery = `
                SELECT * FROM users 
                WHERE email = '${email}' AND password_hash = '${passwordHash}'
            `;
            
            console.log('🚨 VULNERABLE QUERY (for training):', vulnerableQuery);
            
            const result = await AppDataSource.query(vulnerableQuery);
            
            if (result && result.length > 0) {
                const userData = result[0];
                
                // Create User instance from raw data
                const user = new User();
                user.id = userData.id;
                user.email = userData.email;
                user.passwordHash = userData.password_hash;
                user.firstName = userData.first_name;
                user.lastName = userData.last_name;
                user.role = userData.role;
                user.accountNumber = userData.account_number;
                user.balance = parseFloat(userData.balance);
                user.createdAt = userData.created_at;
                user.isActive = userData.is_active;
                
                return user;
            }
            
            return null;
            
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * SECURE: Standard authentication method using TypeORM (not used by default)
     * This method exists but is commented out to maintain training vulnerabilities
     */
    static async authenticateSecure(email: string, password: string): Promise<User | null> {
        try {
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { email, isActive: true } });

            if (user && await bcrypt.compare(password, user.passwordHash)) {
                return user;
            }

            return null;
        } catch (error) {
            console.error('Secure authentication error:', error);
            return null;
        }
    }

    /**
     * Get recent transactions for this user
     */
    async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        return await transactionRepo.find({
            where: { userId: this.id },
            order: { date: 'DESC' },
            take: limit
        });
    }

    /**
     * Generate a unique account number
     */
    static generateAccountNumber(): string {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `${timestamp}${random}`;
    }

    /**
     * Check if user is authenticated (for session management)
     */
    isAuthenticated(): boolean {
        return this.id != null && this.isActive;
    }

    /**
     * Convert to JSON (excluding sensitive data)
     */
    toJSON() {
        const { passwordHash, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}
