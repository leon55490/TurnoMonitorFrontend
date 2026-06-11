import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CreateTurnUseCase } from '../application/use-cases/create-turn.use-case';
import { TurnRepository, TURN_REPOSITORY } from '../domain/ports/turn.repository';
import { CreateTurnDto } from './dto/create-turn.dto';

@Controller('turns')
export class TurnsController {
  constructor(
    private readonly createTurnUseCase: CreateTurnUseCase,
    @Inject(TURN_REPOSITORY) private readonly turnRepo: TurnRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('x-user-role') role: string,
    @Body() dto: CreateTurnDto,
  ) {
    if (role !== 'coordinador') {
      throw new ForbiddenException('Solo el coordinador puede asignar turnos');
    }
    return this.createTurnUseCase.execute(dto);
  }

  @Get()
  async findAll() {
    return this.turnRepo.findAll();
  }
}
