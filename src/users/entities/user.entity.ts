import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ type: 'integer', default: 0 })
  avatarId: number;

  @Column()
  passwordHash: string;

  @Column({ default: 'PROFESOR' })
  role: 'MASTER' | 'PROFESOR';

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: 1 })
  credentialVersion: number;

  @CreateDateColumn()
  createdAt: Date;
}
