import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const POINTS_PER_FCFA = 1 / 100;

// 100 points = 1 000 FCFA de réduction
const FCFA_PER_POINT = 10;
const MIN_REDEEM_POINTS = 100;

const LEVEL_THRESHOLDS = [
  { level: 'platinum', min: 5000 },
  { level: 'gold', min: 2000 },
  { level: 'silver', min: 500 },
  { level: 'bronze', min: 0 },
];

const LEVEL_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine',
};

function computeLevel(totalEarned: number): string {
  for (const { level, min } of LEVEL_THRESHOLDS) {
    if (totalEarned >= min) return level;
  }
  return 'bronze';
}

function nextLevelThreshold(totalEarned: number): number | null {
  const current = computeLevel(totalEarned);
  const currentIdx = LEVEL_THRESHOLDS.findIndex((t) => t.level === current);
  if (currentIdx === 0) return null;
  return LEVEL_THRESHOLDS[currentIdx - 1].min;
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    if (!account) {
      account = await this.prisma.loyaltyAccount.create({
        data: { userId, points: 0, totalEarned: 0, level: 'bronze' },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } },
      });
    }
    return this.format(account);
  }

  async earnPoints(userId: string, amountFcfa: number, bookingId: string, description: string) {
    const points = Math.floor(amountFcfa * POINTS_PER_FCFA);
    if (points <= 0) return;

    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      update: {},
      create: { userId, points: 0, totalEarned: 0, level: 'bronze' },
    });

    const newTotalEarned = account.totalEarned + points;
    const newPoints = account.points + points;
    const newLevel = computeLevel(newTotalEarned);

    await this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: newPoints, totalEarned: newTotalEarned, level: newLevel },
    });

    await this.prisma.loyaltyTransaction.create({
      data: { accountId: account.id, bookingId, type: 'earn', points, description },
    });
  }

  async redeemPoints(userId: string, pointsToRedeem: number, description: string) {
    if (pointsToRedeem < MIN_REDEEM_POINTS) {
      throw new BadRequestException(
        `Le montant minimum de rachat est de ${MIN_REDEEM_POINTS} points.`,
      );
    }

    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new BadRequestException('Compte de fidélité introuvable.');
    }

    if (account.points < pointsToRedeem) {
      throw new BadRequestException(
        `Points insuffisants. Vous avez ${account.points} points, demande : ${pointsToRedeem}.`,
      );
    }

    const discountFcfa = pointsToRedeem * FCFA_PER_POINT;
    const newPoints = account.points - pointsToRedeem;

    await this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: newPoints },
    });

    await this.prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        bookingId: null,
        type: 'redeem',
        points: -pointsToRedeem,
        description: description || `Utilisation de ${pointsToRedeem} pts — réduction ${discountFcfa} FCFA`,
      },
    });

    return {
      pointsRedeemed: pointsToRedeem,
      discountFcfa,
      remainingPoints: newPoints,
      message: `${pointsToRedeem} points utilisés — réduction de ${discountFcfa} FCFA appliquée.`,
    };
  }

  getConversionInfo() {
    return {
      pointsPerFcfa: POINTS_PER_FCFA,
      fcfaPerPoint: FCFA_PER_POINT,
      minRedeemPoints: MIN_REDEEM_POINTS,
      minRedeemFcfa: MIN_REDEEM_POINTS * FCFA_PER_POINT,
      levels: [
        { level: 'bronze', label: 'Bronze', minPoints: 0, benefits: ['Accumulation de points'] },
        { level: 'silver', label: 'Argent', minPoints: 500, benefits: ['5% de bonus sur les points', 'Alertes de prix en avant-première'] },
        { level: 'gold', label: 'Or', minPoints: 2000, benefits: ['10% de bonus sur les points', 'Support prioritaire', 'Annulation flexible'] },
        { level: 'platinum', label: 'Platine', minPoints: 5000, benefits: ['20% de bonus sur les points', 'Lounge VIP en gare', 'Support dédié 24/7'] },
      ],
    };
  }

  private format(account: any) {
    const nextThreshold = nextLevelThreshold(account.totalEarned);
    const progressToNext = nextThreshold
      ? Math.min(100, Math.round((account.totalEarned / nextThreshold) * 100))
      : 100;

    return {
      points: account.points,
      totalEarned: account.totalEarned,
      level: account.level,
      levelLabel: LEVEL_LABELS[account.level] ?? account.level,
      nextLevelAt: nextThreshold,
      progressToNext,
      fcfaPerPoint: FCFA_PER_POINT,
      minRedeemPoints: MIN_REDEEM_POINTS,
      transactions: (account.transactions ?? []).map((t: any) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        description: t.description,
        bookingId: t.bookingId,
        createdAt: t.createdAt,
      })),
    };
  }
}
