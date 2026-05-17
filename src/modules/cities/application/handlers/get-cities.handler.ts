import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetCitiesQuery } from '../queries/get-cities.query';
import { ICityRepository, CITY_REPOSITORY } from '../../domain/repositories/city.repository.interface';

@QueryHandler(GetCitiesQuery)
export class GetCitiesHandler implements IQueryHandler<GetCitiesQuery> {
  constructor(@Inject(CITY_REPOSITORY) private readonly repo: ICityRepository) {}

  async execute() {
    return this.repo.findAll();
  }
}
