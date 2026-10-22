import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../locations/location.entity';
import { User } from '../users/user.entity';
import { Inspection } from './inspection.entity';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inspection, Location, User])],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
