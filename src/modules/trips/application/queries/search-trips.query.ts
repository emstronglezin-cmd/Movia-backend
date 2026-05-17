export class SearchTripsQuery {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly date: string,
    public readonly passengers: number = 1,
    public readonly departureAfter?: string,
  ) {}
}
