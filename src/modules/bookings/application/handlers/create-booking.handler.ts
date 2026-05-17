import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Injectable,
} from '@nestjs/common';
import { CreateBookingCommand } from '../commands/create-booking.command';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/repositories/booking.repository.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { LoyaltyService } from '../../../loyalty/loyalty.service';
import { AiRiskService } from '../../../ai/ai-risk.service';

function generateBookingRef(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `MOV-${year}-${random}`;
}

async function uniqueBookingRef(prisma: PrismaService): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = generateBookingRef();
    const exists = await prisma.booking.findUnique({ where: { bookingReference: ref } });
    if (!exists) return ref;
  }
  throw new Error('Impossible de générer une référence unique');
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  private readonly logger = new Logger(CreateBookingHandler.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    private readonly prisma: PrismaService,
    private readonly aiRiskService: AiRiskService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly loyaltyService?: LoyaltyService,
  ) {}

  async execute(command: CreateBookingCommand) {
    const { userId, tripId, seatNumber, paymentProvider } = command;

    // ── 1. Vérifier que le trajet existe ────────────────────────────────────────
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { company: true },
    });
    if (!trip) throw new NotFoundException('Trajet non trouvé');

    // ── 2. Validation de la date du trajet ──────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(trip.date);
    tripDate.setHours(0, 0, 0, 0);
    if (tripDate < today) {
      throw new BadRequestException('Ce trajet est déjà passé. Veuillez sélectionner un trajet à venir.');
    }

    const maxDays = trip.company.maxBookingDaysAhead ?? 30;
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + maxDays);
    if (tripDate > maxDate) {
      throw new BadRequestException(
        `${trip.company.name} n'accepte les réservations que jusqu'à ${maxDays} jours à l'avance.`,
      );
    }

    // ── 3. Vérification des doublons (hors transaction — peut être re-vérifiée dans tx) ──
    const exactDuplicate = await this.prisma.booking.findFirst({
      where: { userId, tripId, status: { in: ['active', 'reserved'] } },
    });
    if (exactDuplicate) {
      throw new ConflictException(
        `Vous avez déjà une réservation pour ce trajet (Réf: ${exactDuplicate.bookingReference}).`,
      );
    }

    const sameDateRouteBookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['active', 'reserved'] },
        trip: { from: trip.from, to: trip.to, date: trip.date },
      },
      include: { trip: true },
    });

    const newDepMins = parseTimeToMinutes(trip.departureTime);
    for (const existing of sameDateRouteBookings) {
      const existingDepMins = parseTimeToMinutes(existing.trip.departureTime);
      if (Math.abs(newDepMins - existingDepMins) <= 120) {
        throw new ConflictException(
          `Vous avez déjà une réservation sur ${trip.from} → ${trip.to} à ${existing.trip.departureTime} (moins de 2h d'écart).`,
        );
      }
    }

    // ── 4. Analyse IA des risques (non-bloquante) ───────────────────────────────
    const userBookings = await this.prisma.booking.findMany({
      where: { userId, status: 'active' },
      include: { trip: true },
    });
    this.aiRiskService.analyzeRisk({
      userId, tripId,
      from_city: trip.from, to_city: trip.to,
      date: trip.date, departureTime: trip.departureTime,
      passengerCount: 1, price: trip.price,
      paymentProvider: paymentProvider || 'orange_money',
      userBookingHistory: userBookings.map((b) => ({
        from: b.trip.from, to: b.trip.to, date: b.trip.date,
        status: b.status, createdAt: b.createdAt?.toISOString(),
      })),
    }).then((aiResult) => {
      if (aiResult) {
        this.logger.log(`AI risk: score=${aiResult.score} level=${aiResult.riskLevel}`);
        if (aiResult.riskLevel === 'high') {
          this.logger.warn(`HIGH RISK booking by userId=${userId}: ${aiResult.flags?.join(', ')}`);
        }
      }
    }).catch(() => {});

    // ── 5. Réservation sans paiement (mode « réserver maintenant, payer à la gare ») ──
    if (command.skipPayment) {
      return this.prisma.$transaction(async (tx) => {
        // Vérification atomique du siège
        const seatConflict = await tx.booking.findFirst({
          where: { tripId, seatNumber, status: { in: ['active', 'reserved'] } },
        });
        if (seatConflict) throw new ConflictException(`Le siège ${seatNumber} est déjà occupé`);

        const bookingRef = await uniqueBookingRef(this.prisma);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const reserved = await tx.booking.create({
          data: {
            userId, tripId, seatNumber,
            passengerName: command.passengerName,
            passengerPhone: command.passengerPhone,
            passengerCnib: command.passengerCnib ?? null,
            baggageWeight: command.baggageWeight ?? null,
            price: trip.price,
            bookingReference: bookingRef,
            isRoundTrip: command.isRoundTrip ?? false,
            returnDate: command.returnDate ?? null,
            returnDepartureTime: command.returnDepartureTime ?? null,
            returnArrivalTime: command.returnArrivalTime ?? null,
            returnSeatNumber: command.returnSeatNumber ?? null,
            status: 'reserved',
            reservationExpiresAt: expiresAt,
          },
        });

        this.notificationsService?.create(
          userId, 'ticket',
          'Réservation enregistrée',
          `Billet ${bookingRef} (${trip.from} → ${trip.to}) réservé. Payez à la gare avant le départ.`,
          '/(tabs)/tickets',
        ).catch(() => {});

        return { booking: { ...reserved, from: trip.from, to: trip.to, fromStation: trip.fromStation, toStation: trip.toStation, departureTime: trip.departureTime, arrivalTime: trip.arrivalTime, date: trip.date, companyId: trip.companyId }, payment: null };
      });
    }

    // ── 6. Réservation avec paiement ─────────────────────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      // Vérification atomique du siège — prevent race condition
      const seatConflict = await tx.booking.findFirst({
        where: { tripId, seatNumber, status: { in: ['active', 'reserved'] } },
      });
      if (seatConflict) throw new ConflictException(`Le siège ${seatNumber} est déjà occupé`);

      // Créer le paiement
      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const payment = await tx.payment.create({
        data: {
          amount: trip.price,
          provider: paymentProvider || 'orange_money',
          status: 'completed', // TODO: remplacer par 'pending' lors de l'intégration réelle
          reference: paymentRef,
        },
      });

      const bookingRef = await uniqueBookingRef(this.prisma);

      // Créer la réservation en une seule opération (tous les champs d'un coup)
      const booking = await tx.booking.create({
        data: {
          userId, tripId, seatNumber,
          passengerName: command.passengerName,
          passengerPhone: command.passengerPhone,
          passengerCnib: command.passengerCnib ?? null,
          baggageWeight: command.baggageWeight ?? null,
          price: trip.price,
          bookingReference: bookingRef,
          isRoundTrip: command.isRoundTrip ?? false,
          returnDate: command.returnDate ?? null,
          returnDepartureTime: command.returnDepartureTime ?? null,
          returnArrivalTime: command.returnArrivalTime ?? null,
          returnSeatNumber: command.returnSeatNumber ?? null,
          paymentId: payment.id,
          status: 'active',
        },
      });

      // Notifications et fidélité (hors transaction — non-bloquantes)
      setImmediate(() => {
        this.notificationsService?.create(
          userId, 'ticket',
          'Réservation confirmée ✓',
          `Billet ${bookingRef} (${trip.from} → ${trip.to}, ${trip.departureTime}) confirmé. Bon voyage !`,
          '/(tabs)/tickets',
        ).catch(() => {});

        this.loyaltyService?.earnPoints(
          userId, trip.price, booking.id,
          `Trajet ${trip.from} → ${trip.to} (${bookingRef})`,
        ).catch(() => {});
      });

      return {
        booking: {
          ...booking,
          from: trip.from, to: trip.to,
          fromStation: trip.fromStation, toStation: trip.toStation,
          departureTime: trip.departureTime, arrivalTime: trip.arrivalTime,
          date: trip.date, companyId: trip.companyId,
        },
        payment: {
          id: payment.id, reference: paymentRef,
          status: payment.status, amount: payment.amount, provider: payment.provider,
        },
      };
    });
  }
}
