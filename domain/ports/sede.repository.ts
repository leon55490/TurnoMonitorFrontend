import { Sede } from '../entities/sede.entity';
import { Room } from '../entities/room.entity';

export const SEDE_REPOSITORY = 'SEDE_REPOSITORY';

export interface SedeRepository {
  findAll(): Promise<Sede[]>;
  findById(id: string): Promise<Sede | undefined>;
  findRoomsBySede(sedeId: string): Promise<Room[]>;
  findRoomById(roomId: string): Promise<Room | undefined>;
}
