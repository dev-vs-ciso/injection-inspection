/**
 * Feedback model - TypeORM equivalent of Python SQLAlchemy Feedback model
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
import { IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { User } from './user';

@Entity('feedback')
@Index(['userId'])
@Index(['createdAt'])
export class Feedback {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ length: 100 })
    @IsNotEmpty()
    title!: string;

    @Column({ type: 'text' })
    @IsNotEmpty()
    content!: string;

    @Column({ type: 'int' })
    @IsInt()
    @Min(1)
    @Max(5)
    rating!: number;

    @Column({ length: 50, nullable: true })
    category?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    // Relationships
    @ManyToOne(() => User, user => user.feedback, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    /**
     * Get average rating from all feedback
     */
    static async getAverageScore(): Promise<number> {
        // This would be implemented with TypeORM repository
        return 4.2; // Placeholder
    }
}
