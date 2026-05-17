import { BookingEntity } from '../entities/booking.entity';

export interface IBookingRepository {
  create(data: CreateBookingData): Promise<BookingEntity>;
  findByUserId(userId: string): Promise<BookingEntity[]>;
  findById(id: string): Promise<BookingEntity | null>;
  isSeatTaken(tripId: string, seatNumber: number): Promise<boolean>;
}

export interface CreateBookingData {
  userId: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
  price: number;
  bookingReference: string;
  isRoundTrip: boolean;
  status?: string;
  returnDate?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  returnSeatNumber?: number;
  reservationExpiresAt?: Date;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
