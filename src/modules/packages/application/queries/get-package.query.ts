export class GetPackageQuery {
  constructor(
    public readonly packageId: string,
    public readonly userId: string,
  ) {}
}
