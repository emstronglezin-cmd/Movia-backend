import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetMyPackagesQuery } from '../queries/get-my-packages.query';
import { PrismaService } from '../../../../prisma/prisma.service';

@QueryHandler(GetMyPackagesQuery)
export class GetMyPackagesHandler implements IQueryHandler<GetMyPackagesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyPackagesQuery) {
    return this.prisma.package.findMany({
      where: { userId: query.userId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        company: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
