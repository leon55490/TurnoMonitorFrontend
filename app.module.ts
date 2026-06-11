import { Module } from '@nestjs/common';
import { TurnsModule } from './turns/turns.module';
import { MonitorsModule } from './monitors/monitors.module';
import { SedesModule } from './sedes/sedes.module';

@Module({
  imports: [TurnsModule, MonitorsModule, SedesModule],
})
export class AppModule {}
