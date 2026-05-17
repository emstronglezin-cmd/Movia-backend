import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

export type NotifType = 'ticket' | 'colis' | 'info' | 'promo';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(userId: string, type: NotifType, title: string, message: string, linkTo?: string, linkParams?: Record<string, string>) {
    const notif = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        linkTo: linkTo ?? null,
        linkParams: linkParams ? JSON.stringify(linkParams) : null,
      },
    });

    this.gateway.sendNotification(userId, {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      linkTo: notif.linkTo ?? undefined,
      linkParams: notif.linkParams ? JSON.parse(notif.linkParams) : undefined,
    });

    return notif;
  }

  async findByUser(userId: string) {
    const notifs = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifs.map((n) => ({
      ...n,
      linkParams: n.linkParams ? JSON.parse(n.linkParams) : undefined,
      time: this.formatTime(n.createdAt),
    }));
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  private formatTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hier';
    return `Il y a ${days} jours`;
  }
}
