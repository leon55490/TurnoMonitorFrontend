import { Monitor } from '../entities/monitor.entity';

export const MONITOR_REPOSITORY = 'MONITOR_REPOSITORY';

export interface MonitorRepository {
  findAll(): Promise<Monitor[]>;
  findById(id: string): Promise<Monitor | undefined>;
}
