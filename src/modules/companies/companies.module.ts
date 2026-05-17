import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CompaniesController } from './companies.controller';
import { GetCompaniesHandler } from './application/handlers/get-companies.handler';
import { GetCompanyHandler } from './application/handlers/get-company.handler';
import { PrismaCompanyRepository } from './infrastructure/repositories/prisma-company.repository';
import { COMPANY_REPOSITORY } from './domain/repositories/company.repository.interface';

@Module({
  imports: [CqrsModule],
  controllers: [CompaniesController],
  providers: [
    GetCompaniesHandler,
    GetCompanyHandler,
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
  ],
})
export class CompaniesModule {}
