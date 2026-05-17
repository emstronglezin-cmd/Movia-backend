import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ICityRepository } from '../../domain/repositories/city.repository.interface';
import { CityEntity } from '../../domain/entities/city.entity';

@Injectable()
export class PrismaCityRepository implements ICityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CityEntity[]> {
    const cities = await this.prisma.city.findMany({ orderBy: { name: 'asc' } });
    return cities.map((c) => new CityEntity(c.id, c.name, JSON.parse(c.stations)));
  }
}
