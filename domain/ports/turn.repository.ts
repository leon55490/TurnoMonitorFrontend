import { Turn } from '../entities/turn.entity';

export const TURN_REPOSITORY = 'TURN_REPOSITORY';

export interface TurnRepository {
  findAll(): Promise<Turn[]>;
  findByMonitorAndDate(monitorId: string, fecha: string): Promise<Turn[]>;
  findByRoomAndDate(roomId: string, fecha: string): Promise<Turn[]>;
  save(turn: Turn): Promise<Turn>;
}
