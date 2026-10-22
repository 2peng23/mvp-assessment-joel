import { Type } from 'class-transformer';
import {
  IsDateString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CompleteInspectionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId: number;

  @IsDateString({ strict: true })
  startedAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @IsBoolean()
  passed: boolean;
}
