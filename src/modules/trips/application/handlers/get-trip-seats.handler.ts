import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetTripSeatsQuery } from '../queries/get-trip-seats.query';
import { ITripRepository, TRIP_REPOSITORY } from '../../domain/repositories/trip.repository.interface';

@QueryHandler(GetTripSeatsQuery)
export class GetTripSeatsHandler implements IQueryHandler<GetTripSeatsQuery> {
  constructor(@Inject(TRIP_REPOSITORY) private readonly repo: ITripRepository) {}

  async execute(query: GetTripSeatsQuery) {
    const trip = await this.repo.findById(query.tripId);
    if (!trip) throw new NotFoundException('Trajet non trouvé');

    const occupiedSeats = await this.repo.getOccupiedSeats(query.tripId);

    return {
      tripId: trip.id,
      totalSeats: trip.totalSeats,
      occupiedSeats,
      availableCount: trip.totalSeats - occupiedSeats.length,
    };
  }
}
