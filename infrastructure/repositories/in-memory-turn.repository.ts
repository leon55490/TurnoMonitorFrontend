import { Injectable } from '@nestjs/common';
import { Turn } from '../../domain/entities/turn.entity';
import { TurnRepository } from '../../domain/ports/turn.repository';

@Injectable()
export class InMemoryTurnRepository implements TurnRepository {
  private readonly turns: Turn[] = [];

  async findAll(): Promise<Turn[]> {
    return this.turns;
  }

  async findByMonitorAndDate(monitorId: string, fecha: string): Promise<Turn[]> {
    return this.turns.filter((t) => t.monitor_id === monitorId && t.fecha === fecha);
  }

  async findByRoomAndDate(roomId: string, fecha: string): Promise<Turn[]> {
    return this.turns.filter((t) => t.room_id === roomId && t.fecha === fecha);
  }

  async save(turn: Turn): Promise<Turn> {
    this.turns.push(turn);
    return turn;
  }
}
