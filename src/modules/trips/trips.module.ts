import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TripsController } from './trips.controller';
import { SearchTripsHandler } from './application/handlers/search-trips.handler';
import { GetTripSeatsHandler } from './application/handlers/get-trip-seats.handler';
import { GetTripByIdHandler } from './application/handlers/get-trip-by-id.handler';
import { PrismaTripRepository } from './infrastructure/repositories/prisma-trip.repository';
import { TRIP_REPOSITORY } from './domain/repositories/trip.repository.interface';

@Module({
  imports: [CqrsModule],
  controllers: [TripsController],
  providers: [
    SearchTripsHandler,
    GetTripSeatsHandler,
    GetTripByIdHandler,
    { provide: TRIP_REPOSITORY, useClass: PrismaTripRepository },
  ],
  exports: [TRIP_REPOSITORY],
})
export class TripsModule {}
