import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'ESTUDIANTE' })
  role: 'PROFESOR' | 'ESTUDIANTE';

  @ColumnDateColumn()
  CreatedAt: Date;
}
