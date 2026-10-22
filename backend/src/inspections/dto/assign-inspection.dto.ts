import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignInspectionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inspectorId: number;
}
