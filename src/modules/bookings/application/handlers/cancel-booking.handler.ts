import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { CancelBookingCommand } from '../commands/cancel-booking.command';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../notifications/notifications.service';

@CommandHandler(CancelBookingCommand)
export class CancelBookingHandler implements ICommandHandler<CancelBookingCommand> {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async execute(command: CancelBookingCommand) {
    const { bookingId, userId } = command;

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { trip: true } });
    if (!booking) throw new NotFoundException('Réservation non trouvée');
    if (booking.userId !== userId) throw new ForbiddenException('Accès refusé');
    if (booking.status === 'cancelled') throw new BadRequestException('Ce ticket est déjà annulé');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled', updatedAt: new Date() },
    });

    this.notificationsService?.create(
      userId, 'ticket',
      'Réservation annulée',
      `Votre billet ${booking.bookingReference} (${booking.trip.from} → ${booking.trip.to}) a été annulé.`,
      '/(tabs)/tickets',
    ).catch(() => {});

    return { success: true, bookingId: updated.id, status: updated.status };
  }
}
