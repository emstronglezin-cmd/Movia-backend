export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string | null,
    public readonly email: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly avatarUrl: string | null = null,
    public readonly emailVerified: boolean = false,
    public readonly cnib: string | null = null,
  ) {}

  static create(params: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    avatarUrl?: string | null;
    emailVerified?: boolean;
    cnib?: string | null;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.name,
      params.phone,
      params.email,
      params.createdAt,
      params.updatedAt,
      params.avatarUrl ?? null,
      params.emailVerified ?? false,
      params.cnib ?? null,
    );
  }
}
