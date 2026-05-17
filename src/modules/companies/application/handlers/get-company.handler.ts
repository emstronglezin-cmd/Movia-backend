import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetCompanyQuery } from '../queries/get-company.query';
import { ICompanyRepository, COMPANY_REPOSITORY } from '../../domain/repositories/company.repository.interface';

@QueryHandler(GetCompanyQuery)
export class GetCompanyHandler implements IQueryHandler<GetCompanyQuery> {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repo: ICompanyRepository) {}

  async execute(query: GetCompanyQuery) {
    const company = await this.repo.findById(query.id);
    if (!company) throw new NotFoundException('Compagnie non trouvée');
    return company;
  }
}
