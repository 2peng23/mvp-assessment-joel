import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { User } from './users/user.entity';
import { Location } from './locations/location.entity';
import { SeedService } from './seed.service';
import { Inspection } from './inspections/inspection.entity';
import { InspectionsModule } from './inspections/inspections.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3307),
      username: process.env.DB_USER || 'assessment',
      password: process.env.DB_PASSWORD || 'assessment',
      database: process.env.DB_NAME || 'assessment',
      entities: [User, Location, Inspection],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Location]),
    AuthModule,
    UsersModule,
    LocationsModule,
    InspectionsModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
