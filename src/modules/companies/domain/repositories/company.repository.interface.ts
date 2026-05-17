import { CompanyEntity } from '../entities/company.entity';

export interface ICompanyRepository {
  findAll(): Promise<CompanyEntity[]>;
  findById(id: string): Promise<CompanyEntity | null>;
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
