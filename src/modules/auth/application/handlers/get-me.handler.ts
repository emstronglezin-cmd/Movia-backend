import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetMeQuery } from '../queries/get-me.query';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetMeQuery) {
    const user = await this.userRepository.findById(query.userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return {
      id: user.id,
      name: user.name,
      phone: user.phone ?? null,
      email: user.email ?? null,
      avatarUrl: user.avatarUrl ?? null,
      emailVerified: user.emailVerified,
    };
  }
}
