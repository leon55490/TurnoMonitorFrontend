import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Turn } from '../../domain/entities/turn.entity';
import { TurnRepository, TURN_REPOSITORY } from '../../domain/ports/turn.repository';
import { MonitorRepository, MONITOR_REPOSITORY } from '../../domain/ports/monitor.repository';
import { SedeRepository, SEDE_REPOSITORY } from '../../domain/ports/sede.repository';
import { WebhookPort, WEBHOOK_PORT } from '../../domain/ports/webhook.port';
import { CreateTurnDto } from '../../turns/dto/create-turn.dto';

@Injectable()
export class CreateTurnUseCase {
  constructor(
    @Inject(TURN_REPOSITORY) private readonly turnRepo: TurnRepository,
    @Inject(MONITOR_REPOSITORY) private readonly monitorRepo: MonitorRepository,
    @Inject(SEDE_REPOSITORY) private readonly sedeRepo: SedeRepository,
    @Inject(WEBHOOK_PORT) private readonly webhook: WebhookPort,
  ) {}

  async execute(dto: CreateTurnDto): Promise<Turn> {
    const monitor = await this.monitorRepo.findById(dto.monitor_id);
    if (!monitor) {
      throw new NotFoundException('El monitor no está registrado en el sistema');
    }

    const room = await this.sedeRepo.findRoomById(dto.room_id);
    if (!room) {
      throw new NotFoundException('El salón no está registrado en el sistema');
    }

    const sede = await this.sedeRepo.findById(room.sede_id);
    if (
      this.toMinutes(dto.start_time) < this.toMinutes(sede.open_time) ||
      this.toMinutes(dto.end_time) > this.toMinutes(sede.close_time)
    ) {
      throw new UnprocessableEntityException(
        `El horario del turno excede el cierre de la sede (${sede.close_time})`,
      );
    }

    const today = new Date().toISOString().split('T')[0];
    if (dto.fecha < today) {
      throw new UnprocessableEntityException('La fecha del turno no puede ser pasada');
    }

    const monitorTurns = await this.turnRepo.findByMonitorAndDate(dto.monitor_id, dto.fecha);
    const monitorOverlap = monitorTurns.find(
      (t) =>
        this.toMinutes(t.start_time) < this.toMinutes(dto.end_time) &&
        this.toMinutes(t.end_time) > this.toMinutes(dto.start_time),
    );
    if (monitorOverlap) {
      throw new ConflictException('El monitor ya tiene un turno asignado en ese horario');
    }

    const roomTurns = await this.turnRepo.findByRoomAndDate(dto.room_id, dto.fecha);
    const roomOverlap = roomTurns.filter(
      (t) =>
        this.toMinutes(t.start_time) < this.toMinutes(dto.end_time) &&
        this.toMinutes(t.end_time) > this.toMinutes(dto.start_time),
    );
    if (roomOverlap.length >= 2) {
      throw new ConflictException('El salón ha alcanzado su capacidad máxima de monitores');
    }

    const turn: Turn = {
      id: randomUUID(),
      monitor_id: dto.monitor_id,
      room_id: dto.room_id,
      fecha: dto.fecha,
      start_time: dto.start_time,
      end_time: dto.end_time,
      created_at: new Date().toISOString(),
    };

    await this.turnRepo.save(turn);

    this.webhook.fire({
      monitor_email: monitor.email,
      monitor_name: monitor.nombre,
      sede: sede.nombre,
      room: room.nombre,
      fecha: dto.fecha,
      start_time: dto.start_time,
      end_time: dto.end_time,
    });

    return turn;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
