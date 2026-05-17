import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository, CreateBookingData } from '../../domain/repositories/booking.repository.interface';
import { BookingEntity } from '../../domain/entities/booking.entity';

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookingData): Promise<BookingEntity> {
    const b = await this.prisma.booking.create({ data });
    return new BookingEntity(
      b.id, b.userId, b.tripId, b.passengerName, b.passengerPhone,
      b.seatNumber, b.price, b.status, b.bookingReference, b.isRoundTrip,
      b.returnDate, b.returnDepartureTime, b.returnArrivalTime, b.returnSeatNumber,
      b.paymentId, b.createdAt,
    );
  }

  async findByUserId(userId: string): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({ where: { userId } });
    return bookings.map((b) => new BookingEntity(
      b.id, b.userId, b.tripId, b.passengerName, b.passengerPhone,
      b.seatNumber, b.price, b.status, b.bookingReference, b.isRoundTrip,
      b.returnDate, b.returnDepartureTime, b.returnArrivalTime, b.returnSeatNumber,
      b.paymentId, b.createdAt,
    ));
  }

  async findById(id: string): Promise<BookingEntity | null> {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) return null;
    return new BookingEntity(
      b.id, b.userId, b.tripId, b.passengerName, b.passengerPhone,
      b.seatNumber, b.price, b.status, b.bookingReference, b.isRoundTrip,
      b.returnDate, b.returnDepartureTime, b.returnArrivalTime, b.returnSeatNumber,
      b.paymentId, b.createdAt,
    );
  }

  async isSeatTaken(tripId: string, seatNumber: number): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: { tripId, seatNumber, status: { not: 'cancelled' } },
    });
    return count > 0;
  }
}
