import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Location } from '../locations/location.entity';
import { User } from '../users/user.entity';

export enum InspectionStatus {
  YetToStart = 'Yet to Start',
  Completed = 'Completed',
}

@Entity()
export class Inspection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: InspectionStatus, default: InspectionStatus.YetToStart })
  status: InspectionStatus;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationId' })
  location: Location | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedInspectorId' })
  assignedInspector: User | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
