import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMyBookingsQuery } from '../queries/get-my-bookings.query';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/repositories/booking.repository.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

@QueryHandler(GetMyBookingsQuery)
export class GetMyBookingsHandler implements IQueryHandler<GetMyBookingsQuery> {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetMyBookingsQuery) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId: query.userId },
      include: { trip: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      tripId: b.tripId,
      companyId: b.trip.companyId,
      companyName: b.trip.company.name,
      companyShortName: b.trip.company.shortName,
      companyColor: b.trip.company.color,
      passengerName: b.passengerName,
      passengerPhone: b.passengerPhone,
      from: b.trip.from,
      to: b.trip.to,
      fromStation: b.trip.fromStation,
      toStation: b.trip.toStation,
      departureTime: b.trip.departureTime,
      arrivalTime: b.trip.arrivalTime,
      date: b.trip.date,
      seatNumber: b.seatNumber,
      price: b.price,
      status: b.status,
      bookingReference: b.bookingReference,
      isRoundTrip: b.isRoundTrip,
      returnDate: b.returnDate,
      returnDepartureTime: b.returnDepartureTime,
      returnArrivalTime: b.returnArrivalTime,
      returnSeatNumber: b.returnSeatNumber,
      createdAt: b.createdAt,
    }));
  }
}
