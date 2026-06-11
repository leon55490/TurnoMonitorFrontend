import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateTurnDto {
  @IsString()
  @IsNotEmpty()
  monitor_id!: string;

  @IsString()
  @IsNotEmpty()
  room_id!: string;

  @IsDateString()
  fecha!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time debe tener formato HH:MM' })
  start_time!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time debe tener formato HH:MM' })
  end_time!: string;
}
