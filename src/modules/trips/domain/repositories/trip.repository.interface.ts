import { TripEntity } from '../entities/trip.entity';

export interface ITripRepository {
  search(params: { from: string; to: string; date: string }): Promise<TripEntity[]>;
  findById(id: string): Promise<TripEntity | null>;
  getOccupiedSeats(tripId: string): Promise<number[]>;
}

export const TRIP_REPOSITORY = Symbol('TRIP_REPOSITORY');
