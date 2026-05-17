export class TripEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly fromStation: string,
    public readonly toStation: string,
    public readonly departureTime: string,
    public readonly arrivalTime: string,
    public readonly duration: string,
    public readonly price: number,
    public readonly totalSeats: number,
    public readonly date: string,
    public readonly seatsAvailable: number,
  ) {}
}
