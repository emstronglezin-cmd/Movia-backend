import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SearchTripsQuery } from '../queries/search-trips.query';
import { ITripRepository, TRIP_REPOSITORY } from '../../domain/repositories/trip.repository.interface';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@QueryHandler(SearchTripsQuery)
export class SearchTripsHandler implements IQueryHandler<SearchTripsQuery> {
  constructor(@Inject(TRIP_REPOSITORY) private readonly repo: ITripRepository) {}

  async execute(query: SearchTripsQuery) {
    const trips = await this.repo.search({ from: query.from, to: query.to, date: query.date });

    let filtered = trips.filter((t) => t.seatsAvailable >= query.passengers);

    const isToday = query.date === getTodayStr();

    if (query.departureAfter) {
      // Explicit time window requested: show ±90 min around the specified time
      const centerMinutes = timeToMinutes(query.departureAfter);
      const windowMinutes = 90;
      filtered = filtered.filter((t) => {
        const depMinutes = timeToMinutes(t.departureTime);
        return depMinutes >= centerMinutes - windowMinutes && depMinutes <= centerMinutes + windowMinutes;
      });
    } else if (isToday) {
      // Today without explicit time: show only departures from 90 min ago onward
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const bufferMinutes = 90;
      const minMinutes = Math.max(0, currentMinutes - bufferMinutes);
      filtered = filtered.filter((t) => timeToMinutes(t.departureTime) >= minMinutes);
    }
    // Future dates: show all departures

    return filtered.sort((a, b) => timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime));
  }
}
