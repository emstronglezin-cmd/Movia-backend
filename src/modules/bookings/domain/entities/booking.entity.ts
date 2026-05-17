export class BookingEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tripId: string,
    public readonly passengerName: string,
    public readonly passengerPhone: string,
    public readonly seatNumber: number,
    public readonly price: number,
    public readonly status: string,
    public readonly bookingReference: string,
    public readonly isRoundTrip: boolean,
    public readonly returnDate: string | null,
    public readonly returnDepartureTime: string | null,
    public readonly returnArrivalTime: string | null,
    public readonly returnSeatNumber: number | null,
    public readonly paymentId: string | null,
    public readonly createdAt: Date,
  ) {}
}
