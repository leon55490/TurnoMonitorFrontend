import { Module } from '@nestjs/common';
import { MonitorsController } from './monitors.controller';
import { InMemoryMonitorRepository } from '../infrastructure/repositories/in-memory-monitor.repository';
import { MONITOR_REPOSITORY } from '../domain/ports/monitor.repository';

@Module({
  controllers: [MonitorsController],
  providers: [
    { provide: MONITOR_REPOSITORY, useClass: InMemoryMonitorRepository },
  ],
})
export class MonitorsModule {}
