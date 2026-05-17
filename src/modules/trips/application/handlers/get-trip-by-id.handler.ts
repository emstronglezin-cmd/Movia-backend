import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetTripByIdQuery } from '../queries/get-trip-by-id.query';
import { ITripRepository, TRIP_REPOSITORY } from '../../domain/repositories/trip.repository.interface';

@QueryHandler(GetTripByIdQuery)
export class GetTripByIdHandler implements IQueryHandler<GetTripByIdQuery> {
  constructor(@Inject(TRIP_REPOSITORY) private readonly repo: ITripRepository) {}

  async execute(query: GetTripByIdQuery) {
    const trip = await this.repo.findById(query.tripId);
    if (!trip) throw new NotFoundException('Trajet non trouvé');
    return trip;
  }
}
