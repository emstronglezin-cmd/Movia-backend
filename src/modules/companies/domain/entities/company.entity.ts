export class CompanyEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly shortName: string,
    public readonly color: string,
    public readonly supportsReservation: boolean,
    public readonly requiresImmediatePayment: boolean,
    public readonly isFeatured: boolean = false,
    public readonly featuredOrder: number | null = null,
    public readonly maxBookingDaysAhead: number = 30,
    public readonly phone: string | null = null,
    public readonly email: string | null = null,
    public readonly description: string | null = null,
    public readonly schedules: string | null = null,
  ) {}
}
