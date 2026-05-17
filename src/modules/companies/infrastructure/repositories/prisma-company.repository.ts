import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ICompanyRepository } from '../../domain/repositories/company.repository.interface';
import { CompanyEntity } from '../../domain/entities/company.entity';

@Injectable()
export class PrismaCompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CompanyEntity[]> {
    const companies = await this.prisma.company.findMany();
    // Featured companies first (sorted by featuredOrder), then alphabetical
    const featured = companies
      .filter((c) => c.isFeatured && (c.featuredUntil === null || c.featuredUntil > new Date()))
      .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));
    const others = companies
      .filter((c) => !c.isFeatured || (c.featuredUntil !== null && c.featuredUntil <= new Date()))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return [...featured, ...others].map((c) => this.toEntity(c));
  }

  async findById(id: string): Promise<CompanyEntity | null> {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) return null;
    return this.toEntity(c);
  }

  private toEntity(c: any): CompanyEntity {
    return new CompanyEntity(
      c.id, c.name, c.shortName, c.color,
      c.supportsReservation, c.requiresImmediatePayment,
      c.isFeatured ?? false, c.featuredOrder ?? null,
      c.maxBookingDaysAhead ?? 30,
      c.phone ?? null, c.email ?? null, c.description ?? null, c.schedules ?? null,
    );
  }
}
