import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetCompaniesQuery } from './application/queries/get-companies.query';
import { GetCompanyQuery } from './application/queries/get-company.query';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Liste des compagnies de transport' })
  findAll() {
    return this.queryBus.execute(new GetCompaniesQuery());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une compagnie' })
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyQuery(id));
  }
}
