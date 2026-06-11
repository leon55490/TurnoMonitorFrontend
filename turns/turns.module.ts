import { Module } from '@nestjs/common';
import { TurnsController } from './turns.controller';
import { CreateTurnUseCase } from '../application/use-cases/create-turn.use-case';
import { InMemoryTurnRepository } from '../infrastructure/repositories/in-memory-turn.repository';
import { InMemoryMonitorRepository } from '../infrastructure/repositories/in-memory-monitor.repository';
import { InMemorySedeRepository } from '../infrastructure/repositories/in-memory-sede.repository';
import { HttpWebhookAdapter } from '../infrastructure/adapters/http-webhook.adapter';
import { TURN_REPOSITORY } from '../domain/ports/turn.repository';
import { MONITOR_REPOSITORY } from '../domain/ports/monitor.repository';
import { SEDE_REPOSITORY } from '../domain/ports/sede.repository';
import { WEBHOOK_PORT } from '../domain/ports/webhook.port';

@Module({
  controllers: [TurnsController],
  providers: [
    CreateTurnUseCase,
    { provide: TURN_REPOSITORY, useClass: InMemoryTurnRepository },
    { provide: MONITOR_REPOSITORY, useClass: InMemoryMonitorRepository },
    { provide: SEDE_REPOSITORY, useClass: InMemorySedeRepository },
    { provide: WEBHOOK_PORT, useClass: HttpWebhookAdapter },
  ],
})
export class TurnsModule {}
