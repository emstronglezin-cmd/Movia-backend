export interface BatchPassenger {
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
  passengerCnib?: string;
  baggageWeight?: string;
}

export class CreateBatchBookingCommand {
  constructor(
    public readonly userId: string,
    public readonly tripId: string,
    public readonly passengers: BatchPassenger[],
    public readonly paymentProvider: string,
    public readonly isRoundTrip: boolean = false,
    public readonly returnDate?: string,
    public readonly returnDepartureTime?: string,
    public readonly returnArrivalTime?: string,
    public readonly skipPayment: boolean = false,
  ) {}
}
