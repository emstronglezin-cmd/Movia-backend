export class GetBookingQuery {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
  ) {}
}
