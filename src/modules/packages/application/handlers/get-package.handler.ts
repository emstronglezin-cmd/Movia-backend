import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetPackageQuery } from '../queries/get-package.query';
import { PrismaService } from '../../../../prisma/prisma.service';

@QueryHandler(GetPackageQuery)
export class GetPackageHandler implements IQueryHandler<GetPackageQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPackageQuery) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: query.packageId },
      include: { steps: { orderBy: { order: 'asc' } }, company: true },
    });

    if (!pkg) throw new NotFoundException('Colis non trouvé');
    if (pkg.userId !== query.userId) throw new ForbiddenException('Accès non autorisé');

    return pkg;
  }
}
