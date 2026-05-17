import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetCitiesQuery } from './application/queries/get-cities.query';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Liste des villes desservies' })
  findAll() {
    return this.queryBus.execute(new GetCitiesQuery());
  }
}
