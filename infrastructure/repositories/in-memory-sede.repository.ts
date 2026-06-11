import { Injectable, NotFoundException } from '@nestjs/common';
import { Sede } from '../../domain/entities/sede.entity';
import { Room } from '../../domain/entities/room.entity';
import { SedeRepository } from '../../domain/ports/sede.repository';
import { SEDES_MOCK, ROOMS_MOCK } from '../../mocks/sedes.mock';

@Injectable()
export class InMemorySedeRepository implements SedeRepository {
  async findAll(): Promise<Sede[]> {
    return SEDES_MOCK;
  }

  async findById(id: string): Promise<Sede | undefined> {
    return SEDES_MOCK.find((s) => s.id === id);
  }

  async findRoomsBySede(sedeId: string): Promise<Room[]> {
    const sede = SEDES_MOCK.find((s) => s.id === sedeId);
    if (!sede) {
      throw new NotFoundException(`Sede con id "${sedeId}" no encontrada`);
    }
    return ROOMS_MOCK.filter((r) => r.sede_id === sedeId);
  }

  async findRoomById(roomId: string): Promise<Room | undefined> {
    return ROOMS_MOCK.find((r) => r.id === roomId);
  }
}
