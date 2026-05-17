import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CitiesController } from './cities.controller';
import { GetCitiesHandler } from './application/handlers/get-cities.handler';
import { PrismaCityRepository } from './infrastructure/repositories/prisma-city.repository';
import { CITY_REPOSITORY } from './domain/repositories/city.repository.interface';

@Module({
  imports: [CqrsModule],
  controllers: [CitiesController],
  providers: [
    GetCitiesHandler,
    { provide: CITY_REPOSITORY, useClass: PrismaCityRepository },
  ],
})
export class CitiesModule {}
