import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from './User';
import { AppDataSource } from '../database';

@Entity('feedback')
@Index(['userId'])
@Index(['createdAt'])
export class Feedback {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @Column({ type: 'int' })
    score: number; // 1-5 star rating

    @Column({ type: 'text' })
    message: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'is_anonymous', type: 'boolean', default: false })
    isAnonymous: boolean;

    // Relationships
    @ManyToOne(() => User, user => user.feedback)
    @JoinColumn({ name: 'user_id' })
    user: User;

    // Instance methods
    getStarDisplay(): string {
        return '★'.repeat(this.score) + '☆'.repeat(5 - this.score);
    }

    getDisplayName(): string {
        if (this.isAnonymous) {
            return 'Anonymous Customer';
        }
        return this.user ? this.user.getFullName() : 'Unknown User';
    }

    // Static methods
    static async getRecentFeedback(limit: number = 3): Promise<Feedback[]> {
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        return await feedbackRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user']
        });
    }

    static async getScoreDistribution(): Promise<Record<number, number>> {
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        const distribution: Record<number, number> = {};
        
        for (let score = 1; score <= 5; score++) {
            const count = await feedbackRepo.count({ where: { score } });
            distribution[score] = count;
        }
        
        return distribution;
    }

    static async getAllFeedback(): Promise<Feedback[]> {
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        return await feedbackRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['user']
        });
    }

    static async getAverageScore(): Promise<number> {
        const feedbackRepo = AppDataSource.getRepository(Feedback);
        const result = await feedbackRepo
            .createQueryBuilder('feedback')
            .select('AVG(feedback.score)', 'avg')
            .getRawOne();
        
        const average = parseFloat(result?.avg || '0');
        return Math.round(average * 10) / 10;
    }
}