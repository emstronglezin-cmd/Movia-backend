import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetCompaniesQuery } from '../queries/get-companies.query';
import { ICompanyRepository, COMPANY_REPOSITORY } from '../../domain/repositories/company.repository.interface';

@QueryHandler(GetCompaniesQuery)
export class GetCompaniesHandler implements IQueryHandler<GetCompaniesQuery> {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repo: ICompanyRepository) {}

  async execute() {
    return this.repo.findAll();
  }
}
