import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_requests')
export class UserRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ip_address: string;

  @Column('text')
  user_agent: string;

  @Column()
  request_url: string;

  @Column()
  method: string;

  @CreateDateColumn()
  created_at: Date;
}
