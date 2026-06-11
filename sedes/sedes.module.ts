import { Module } from '@nestjs/common';
import { SedesController } from './sedes.controller';
import { InMemorySedeRepository } from '../infrastructure/repositories/in-memory-sede.repository';
import { SEDE_REPOSITORY } from '../domain/ports/sede.repository';

@Module({
  controllers: [SedesController],
  providers: [
    { provide: SEDE_REPOSITORY, useClass: InMemorySedeRepository },
  ],
})
export class SedesModule {}
