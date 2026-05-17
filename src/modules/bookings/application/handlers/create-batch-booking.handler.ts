import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { CreateBatchBookingCommand } from '../commands/create-batch-booking.command';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LoyaltyService } from '../../../loyalty/loyalty.service';

function generateBookingRef(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `MOV-${year}-${random}`;
}

async function uniqueRef(prisma: PrismaService): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = generateBookingRef();
    const exists = await prisma.booking.findUnique({ where: { bookingReference: ref } });
    if (!exists) return ref;
  }
  throw new Error('Could not generate unique booking reference');
}

@CommandHandler(CreateBatchBookingCommand)
export class CreateBatchBookingHandler implements ICommandHandler<CreateBatchBookingCommand> {
  private readonly logger = new Logger(CreateBatchBookingHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly loyaltyService?: LoyaltyService,
  ) {}

  async execute(command: CreateBatchBookingCommand) {
    const { userId, tripId, passengers, paymentProvider, isRoundTrip, returnDate, returnDepartureTime, returnArrivalTime, skipPayment } = command;

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: { company: true } });
    if (!trip) throw new NotFoundException('Trajet non trouvé');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(trip.date);
    tripDate.setHours(0, 0, 0, 0);
    if (tripDate < today) throw new BadRequestException('Ce trajet est déjà passé.');

    const maxDays = trip.company.maxBookingDaysAhead ?? 30;
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + maxDays);
    if (tripDate > maxDate) {
      throw new BadRequestException(
        `${trip.company.name} n'accepte les réservations que jusqu'à ${maxDays} jours à l'avance (date limite: ${maxDate.toLocaleDateString('fr-FR')}).`,
      );
    }

    // Check all seats are free
    const requestedSeats = passengers.map((p) => p.seatNumber);
    const duplicateSeats = requestedSeats.filter((s, i) => requestedSeats.indexOf(s) !== i);
    if (duplicateSeats.length > 0) throw new ConflictException(`Sièges en double dans la requête: ${duplicateSeats.join(', ')}`);

    const takenSeats = await this.prisma.booking.findMany({
      where: { tripId, seatNumber: { in: requestedSeats }, status: { not: 'cancelled' } },
      select: { seatNumber: true },
    });
    if (takenSeats.length > 0) {
      throw new ConflictException(`Sièges déjà pris: ${takenSeats.map((b) => b.seatNumber).join(', ')}`);
    }

    const expiresAt = skipPayment ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;
    const status = skipPayment ? 'reserved' : 'active';

    // Generate refs and create payment in transaction
    const refs = await Promise.all(passengers.map(() => uniqueRef(this.prisma)));

    const bookings = await this.prisma.$transaction(async (tx) => {
      let paymentId: string | null = null;

      if (!skipPayment) {
        const totalAmount = trip.price * passengers.length;
        const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const payment = await tx.payment.create({
          data: { amount: totalAmount, provider: paymentProvider || 'orange_money', status: 'completed', reference: paymentRef },
        });
        paymentId = payment.id;
      }

      return Promise.all(
        passengers.map((p, i) =>
          tx.booking.create({
            data: {
              userId,
              tripId,
              passengerName: p.passengerName,
              passengerPhone: p.passengerPhone,
              passengerCnib: p.passengerCnib ?? null,
              seatNumber: p.seatNumber,
              price: trip.price,
              status,
              bookingReference: refs[i],
              isRoundTrip,
              returnDate: returnDate ?? null,
              returnDepartureTime: returnDepartureTime ?? null,
              returnArrivalTime: returnArrivalTime ?? null,
              ...(paymentId && { paymentId }),
              ...(p.baggageWeight && { baggageWeight: p.baggageWeight }),
              ...(expiresAt && { reservationExpiresAt: expiresAt }),
            },
          }),
        ),
      );
    });

    // ── Accumulate loyalty points per paid booking (non-blocking) ──
    if (!skipPayment) {
      for (const booking of bookings) {
        this.loyaltyService?.earnPoints(
          userId,
          trip.price,
          booking.id,
          `Trajet ${trip.from} → ${trip.to} (${booking.bookingReference})`,
        ).catch(() => {});
      }
    }

    return {
      bookings: bookings.map((b) => ({
        ...b,
        from: trip.from,
        to: trip.to,
        fromStation: trip.fromStation,
        toStation: trip.toStation,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        date: trip.date,
        companyId: trip.companyId,
      })),
      passengerCount: bookings.length,
      totalAmount: trip.price * bookings.length,
    };
  }
}
