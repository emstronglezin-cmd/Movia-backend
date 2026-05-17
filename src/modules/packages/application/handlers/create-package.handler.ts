import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { CreatePackageCommand } from '../commands/create-package.command';
import { PrismaService } from '../../../../prisma/prisma.service';

const PRICE_PER_KG = 1000;
const BASE_PRICE = 1500;

function calculatePrice(weight: string): number {
  const kg = parseFloat(weight.replace(/[^0-9.]/g, ''));
  if (isNaN(kg)) return BASE_PRICE;
  return BASE_PRICE + Math.ceil(kg) * PRICE_PER_KG;
}

@CommandHandler(CreatePackageCommand)
export class CreatePackageHandler implements ICommandHandler<CreatePackageCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePackageCommand) {
    const company = await this.prisma.company.findUnique({ where: { id: command.companyId } });
    if (!company) throw new NotFoundException('Compagnie non trouvée');

    const reference = `COL-${Date.now().toString().slice(-6)}`;
    const price = calculatePrice(command.weight);
    const today = new Date().toISOString().split('T')[0];

    const pkg = await this.prisma.package.create({
      data: {
        reference,
        userId: command.userId,
        companyId: command.companyId,
        from: command.from,
        to: command.to,
        fromStation: command.fromStation,
        toStation: command.toStation,
        senderName: command.senderName,
        senderPhone: command.senderPhone,
        recipientName: command.recipientName,
        recipientPhone: command.recipientPhone,
        description: command.description,
        weight: command.weight,
        price,
        status: 'en_cours',
        date: today,
        steps: {
          create: [
            { label: 'Déposé', date: today, completed: true, active: false, order: 1 },
            { label: 'En transit', date: null, completed: false, active: true, order: 2 },
            { label: 'En agence', date: null, completed: false, active: false, order: 3 },
            { label: 'Livré', date: null, completed: false, active: false, order: 4 },
          ],
        },
      },
      include: { steps: { orderBy: { order: 'asc' } }, company: true },
    });

    return pkg;
  }
}
