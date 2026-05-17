import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { TripEntity } from '../../domain/entities/trip.entity';

@Injectable()
export class PrismaTripRepository implements ITripRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: { from: string; to: string; date: string }): Promise<TripEntity[]> {
    const trips = await this.prisma.trip.findMany({
      where: { from: params.from, to: params.to, date: params.date },
      include: { bookings: { where: { status: { not: 'cancelled' } }, select: { seatNumber: true } } },
    });

    return trips.map((t) => {
      const occupiedCount = t.bookings.length;
      return new TripEntity(
        t.id, t.companyId, t.from, t.to, t.fromStation, t.toStation,
        t.departureTime, t.arrivalTime, t.duration, t.price,
        t.totalSeats, t.date, t.totalSeats - occupiedCount,
      );
    });
  }

  async findById(id: string): Promise<TripEntity | null> {
    const t = await this.prisma.trip.findUnique({
      where: { id },
      include: { bookings: { where: { status: { not: 'cancelled' } }, select: { seatNumber: true } } },
    });
    if (!t) return null;
    const occupiedCount = t.bookings.length;
    return new TripEntity(
      t.id, t.companyId, t.from, t.to, t.fromStation, t.toStation,
      t.departureTime, t.arrivalTime, t.duration, t.price,
      t.totalSeats, t.date, t.totalSeats - occupiedCount,
    );
  }

  async getOccupiedSeats(tripId: string): Promise<number[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { tripId, status: { not: 'cancelled' } },
      select: { seatNumber: true },
    });
    return bookings.map((b) => b.seatNumber);
  }
}
