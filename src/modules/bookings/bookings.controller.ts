import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiExcludeEndpoint, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBookingDto } from './application/dtos/create-booking.dto';
import { CreateBatchBookingDto } from './application/dtos/create-batch-booking.dto';
import { CreateBookingCommand } from './application/commands/create-booking.command';
import { CreateBatchBookingCommand } from './application/commands/create-batch-booking.command';
import { GetMyBookingsQuery } from './application/queries/get-my-bookings.query';
import { GetBookingQuery } from './application/queries/get-booking.query';
import { CancelBookingCommand } from './application/commands/cancel-booking.command';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer une réservation + paiement' })
  create(
    @CurrentUser() user: { id: string; name: string; phone: string },
    @Body() dto: CreateBookingDto,
  ) {
    return this.commandBus.execute(
      new CreateBookingCommand(
        user.id,
        dto.tripId,
        dto.passengerName || user.name,
        dto.passengerPhone || user.phone,
        dto.seatNumber,
        dto.paymentProvider ?? 'orange_money',
        dto.isRoundTrip ?? false,
        dto.returnDate,
        dto.returnDepartureTime,
        dto.returnArrivalTime,
        dto.returnSeatNumber,
        dto.passengerCnib,
        dto.baggageWeight,
        dto.skipPayment ?? false,
      ),
    );
  }

  @Post('batch')
  @ApiOperation({ summary: 'Réserver plusieurs passagers en une transaction atomique' })
  createBatch(
    @CurrentUser() user: { id: string; name: string; phone: string },
    @Body() dto: CreateBatchBookingDto,
  ) {
    return this.commandBus.execute(
      new CreateBatchBookingCommand(
        user.id,
        dto.tripId,
        dto.passengers,
        dto.paymentProvider ?? 'orange_money',
        dto.isRoundTrip ?? false,
        dto.returnDate,
        dto.returnDepartureTime,
        dto.returnArrivalTime,
        dto.skipPayment ?? false,
      ),
    );
  }

  // ─── GET MES RÉSERVATIONS (routes aliases) ────────────────────────────────

  @Get('user')
  @ApiOperation({ summary: 'Mes réservations (GET /bookings/user)' })
  myBookingsUser(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetMyBookingsQuery(user.id));
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes réservations (GET /bookings/my — alias de /user)' })
  myBookings(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetMyBookingsQuery(user.id));
  }

  // ─── SCAN QR (contrôleur) ────────────────────────────────────────────────

  @Get('scan')
  @ApiOperation({ summary: 'Valider un ticket QR (scan par le contrôleur)' })
  @ApiQuery({ name: 'qrCode', required: true, description: 'Code QR du ticket à scanner' })
  async scanTicket(
    @Query('qrCode') qrCode: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!qrCode) {
      return { valid: false, message: 'Code QR manquant' };
    }

    // Rechercher la réservation par référence de booking (le QR code = bookingReference)
    const booking = await this.prisma.booking.findFirst({
      where: { bookingReference: qrCode },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        trip: {
          include: {
            company: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    if (!booking) {
      return {
        valid: false,
        message: 'Ticket introuvable',
        qrCode,
      };
    }

    if (booking.status === 'cancelled') {
      return {
        valid: false,
        message: 'Ce ticket a été annulé',
        booking: {
          id: booking.id,
          reference: booking.bookingReference,
          status: booking.status,
        },
      };
    }

    if (booking.status === 'used') {
      return {
        valid: false,
        message: 'Ce ticket a déjà été utilisé',
        booking: {
          id: booking.id,
          reference: booking.bookingReference,
          status: booking.status,
          passengerName: booking.passengerName,
        },
      };
    }

    return {
      valid: true,
      message: 'Ticket valide',
      booking: {
        id: booking.id,
        reference: booking.bookingReference,
        status: booking.status,
        passengerName: booking.passengerName,
        passengerPhone: booking.passengerPhone,
        seatNumber: booking.seatNumber,
        price: booking.price,
        trip: {
          id: booking.trip.id,
          from: booking.trip.from,
          to: booking.trip.to,
          fromStation: booking.trip.fromStation,
          toStation: booking.trip.toStation,
          departureTime: booking.trip.departureTime,
          arrivalTime: booking.trip.arrivalTime,
          date: booking.trip.date,
          company: booking.trip.company,
        },
        user: booking.user,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une réservation' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetBookingQuery(id, user.id));
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.commandBus.execute(new CancelBookingCommand(id, user.id));
  }

  // ─── MARQUER TICKET COMME UTILISÉ (contrôleur) ───────────────────────────

  @Patch(':id/use')
  @ApiOperation({ summary: 'Marquer un ticket comme utilisé (scan validé par contrôleur)' })
  async markAsUsed(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Réservation non trouvée');

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'used' },
    });
  }

  @Patch(':id/status')
  @UseGuards(InternalApiGuard)
  @ApiExcludeEndpoint()
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.prisma.booking.update({ where: { id }, data: { status } });
  }

  @Get('admin/active-upcoming')
  @UseGuards(InternalApiGuard)
  @ApiExcludeEndpoint()
  async activeUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    return this.prisma.booking.findMany({
      where: { status: 'active', trip: { date: { gte: today } } },
      select: {
        id: true,
        userId: true,
        bookingReference: true,
        trip: {
          select: {
            date: true,
            departureTime: true,
            from: true,
            to: true,
            company: { select: { name: true } },
          },
        },
      },
    });
  }
}
