import { UserEntity } from '../entities/user.entity';

export interface IUserRepository {
  findByPhone(phone: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByPhoneAndCnib(phone: string, cnib: string): Promise<UserEntity | null>;
  create(data: { name: string; phone?: string; email?: string; cnib?: string }): Promise<UserEntity>;
  update(
    id: string,
    data: Partial<{ name: string; email: string; avatarUrl: string; emailVerified: boolean; cnib: string }>,
  ): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
