import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetBookingQuery } from '../queries/get-booking.query';
import { PrismaService } from '../../../../prisma/prisma.service';

@QueryHandler(GetBookingQuery)
export class GetBookingHandler implements IQueryHandler<GetBookingQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBookingQuery) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: query.bookingId },
      include: { trip: { include: { company: true } }, payment: true },
    });

    if (!booking) throw new NotFoundException('Réservation non trouvée');
    if (booking.userId !== query.userId) throw new ForbiddenException('Accès non autorisé');

    return {
      id: booking.id,
      tripId: booking.tripId,
      companyId: booking.trip.companyId,
      companyName: booking.trip.company.name,
      companyShortName: booking.trip.company.shortName,
      companyColor: booking.trip.company.color,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      from: booking.trip.from,
      to: booking.trip.to,
      fromStation: booking.trip.fromStation,
      toStation: booking.trip.toStation,
      departureTime: booking.trip.departureTime,
      arrivalTime: booking.trip.arrivalTime,
      date: booking.trip.date,
      seatNumber: booking.seatNumber,
      price: booking.price,
      status: booking.status,
      bookingReference: booking.bookingReference,
      isRoundTrip: booking.isRoundTrip,
      returnDate: booking.returnDate,
      returnDepartureTime: booking.returnDepartureTime,
      returnArrivalTime: booking.returnArrivalTime,
      returnSeatNumber: booking.returnSeatNumber,
      payment: booking.payment,
      createdAt: booking.createdAt,
    };
  }
}
