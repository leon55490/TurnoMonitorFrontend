import { Controller, Get, Inject } from '@nestjs/common';
import { MonitorRepository, MONITOR_REPOSITORY } from '../domain/ports/monitor.repository';

@Controller('monitors')
export class MonitorsController {
  constructor(
    @Inject(MONITOR_REPOSITORY) private readonly monitorRepo: MonitorRepository,
  ) {}

  @Get()
  async findAll() {
    return this.monitorRepo.findAll();
  }
}
