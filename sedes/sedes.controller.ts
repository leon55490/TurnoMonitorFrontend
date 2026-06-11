import { Controller, Get, Inject, Param } from '@nestjs/common';
import { SedeRepository, SEDE_REPOSITORY } from '../domain/ports/sede.repository';

@Controller('sedes')
export class SedesController {
  constructor(
    @Inject(SEDE_REPOSITORY) private readonly sedeRepo: SedeRepository,
  ) {}

  @Get()
  async findAll() {
    return this.sedeRepo.findAll();
  }

  @Get(':sedeId/rooms')
  async findRooms(@Param('sedeId') sedeId: string) {
    return this.sedeRepo.findRoomsBySede(sedeId);
  }
}
