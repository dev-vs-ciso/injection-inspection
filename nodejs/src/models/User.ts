import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { Feedback } from './Feedback';
import { AppDataSource } from '../database';
import { createHash } from 'crypto';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, type: 'varchar', length: 120 })
    email: string;

    @Column({ name: 'password_hash', type: 'varchar', length: 255 })
    passwordHash: string;

    @Column({ name: 'first_name', type: 'varchar', length: 50 })
    firstName: string;

    @Column({ name: 'last_name', type: 'varchar', length: 50 })
    lastName: string;

    @Column({ type: 'varchar', length: 20, default: 'customer' })
    role: string;

    @Column({ name: 'account_number', unique: true, type: 'varchar', length: 20 })
    accountNumber: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 1000.00 })
    balance: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    // Relationships
    @OneToMany(() => Transaction, transaction => transaction.user, { cascade: true })
    transactions: Transaction[];

    @OneToMany(() => Feedback, feedback => feedback.user, { cascade: true })
    feedback: Feedback[];

    // Instance methods
    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    async getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        return await transactionRepo.find({
            where: { user: { id: this.id } },
            order: { date: 'DESC' },
            take: limit
        });
    }

    setPassword(password: string): void {
        // VULNERABLE VERSION (for training purposes):
        // Using simple MD5 hash - NEVER use in production!
        this.passwordHash = createHash('md5').update(password).digest('hex');
    }

    checkPassword(password: string): boolean {
        // VULNERABLE VERSION (for training purposes):
        // Using simple MD5 hash comparison - NEVER use in production!
        const hash = createHash('md5').update(password).digest('hex');
        return this.passwordHash === hash;
    }

    // Static methods for authentication
    static async authenticate(email: string, password: string): Promise<User | null> {
        /**
         * EXTREMELY VULNERABLE: Authentication method with SQL injection vulnerabilities
         * This method demonstrates dangerous raw SQL usage for training purposes
         * DO NOT USE IN PRODUCTION
         */
        try {
            const passwordHash = createHash('md5').update(password).digest('hex');

            // VULNERABILITY: Direct string interpolation allows SQL injection
            const vulnerableQuery = `
                SELECT id, email, password_hash, first_name, last_name, 
                       account_number, balance, created_at, is_active 
                FROM users 
                WHERE password_hash = '${passwordHash}'
                    AND email = '${email}'
                LIMIT 1
            `;

            const result = await AppDataSource.query(vulnerableQuery);

            if (result && result.length > 0) {
                const userData = result[0];
                
                // Create a User object from the raw result
                const user = new User();
                user.id = userData.id;
                user.email = userData.email;
                user.passwordHash = userData.password_hash;
                user.firstName = userData.first_name;
                user.lastName = userData.last_name;
                user.accountNumber = userData.account_number;
                user.balance = parseFloat(userData.balance);
                user.createdAt = userData.created_at;
                user.isActive = userData.is_active;

                return user;
            }

            return null;

        } catch (error: any) {
            // VULNERABILITY: Expose SQL errors to help with training
            throw new Error(`Database error (SQL injection point): ${error.message}`);
        }
    }

    static async standardLoginCheck(email: string, password: string): Promise<User | null> {
        /**
         * SECURE: Standard login method using TypeORM
         * This is the SAFE implementation that should be used in production
         * Protected against SQL injection attacks
         * NOTE: This function exists but is NOT currently used by the login() function
         */
        const userRepo = AppDataSource.getRepository(User);
        
        const user = await userRepo.findOne({ where: { email } });
        
        if (user && user.checkPassword(password)) {
            return user;
        }
        return null;
    }
}