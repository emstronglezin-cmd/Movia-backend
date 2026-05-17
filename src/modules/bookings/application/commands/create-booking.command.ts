export class CreateBookingCommand {
  constructor(
    public readonly userId: string,
    public readonly tripId: string,
    public readonly passengerName: string,
    public readonly passengerPhone: string,
    public readonly seatNumber: number,
    public readonly paymentProvider: string,
    public readonly isRoundTrip: boolean = false,
    public readonly returnDate?: string,
    public readonly returnDepartureTime?: string,
    public readonly returnArrivalTime?: string,
    public readonly returnSeatNumber?: number,
    public readonly passengerCnib?: string,
    public readonly baggageWeight?: string,
    public readonly skipPayment: boolean = false,
  ) {}
}
