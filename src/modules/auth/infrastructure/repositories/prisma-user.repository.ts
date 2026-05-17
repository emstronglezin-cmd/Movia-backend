import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return null;
    return UserEntity.create(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return UserEntity.create(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return UserEntity.create(user);
  }

  async findByPhoneAndCnib(phone: string, cnib: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { phone, cnib } });
    if (!user) return null;
    return UserEntity.create(user);
  }

  async create(data: { name: string; phone?: string; email?: string; cnib?: string }): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data });
    return UserEntity.create(user);
  }

  async update(
    id: string,
    data: Partial<{ name: string; email: string; avatarUrl: string; emailVerified: boolean; cnib: string }>,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return UserEntity.create(user);
  }
}
