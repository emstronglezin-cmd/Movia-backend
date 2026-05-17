export class CityEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly stations: string[],
  ) {}
}
