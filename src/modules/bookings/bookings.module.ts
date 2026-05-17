import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BookingsController } from './bookings.controller';
import { CreateBookingHandler } from './application/handlers/create-booking.handler';
import { CreateBatchBookingHandler } from './application/handlers/create-batch-booking.handler';
import { GetMyBookingsHandler } from './application/handlers/get-my-bookings.handler';
import { GetBookingHandler } from './application/handlers/get-booking.handler';
import { CancelBookingHandler } from './application/handlers/cancel-booking.handler';
import { PrismaBookingRepository } from './infrastructure/repositories/prisma-booking.repository';
import { BOOKING_REPOSITORY } from './domain/repositories/booking.repository.interface';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [CqrsModule, NotificationsModule, LoyaltyModule],
  controllers: [BookingsController],
  providers: [
    CreateBookingHandler,
    CreateBatchBookingHandler,
    GetMyBookingsHandler,
    GetBookingHandler,
    CancelBookingHandler,
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
  ],
  exports: [CqrsModule],
})
export class BookingsModule {}
