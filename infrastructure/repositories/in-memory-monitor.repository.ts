import { Injectable } from '@nestjs/common';
import { Monitor } from '../../domain/entities/monitor.entity';
import { MonitorRepository } from '../../domain/ports/monitor.repository';
import { MONITORS_MOCK } from '../../mocks/monitors.mock';

@Injectable()
export class InMemoryMonitorRepository implements MonitorRepository {
  async findAll(): Promise<Monitor[]> {
    return MONITORS_MOCK;
  }

  async findById(id: string): Promise<Monitor | undefined> {
    return MONITORS_MOCK.find((m) => m.id === id);
  }
}
