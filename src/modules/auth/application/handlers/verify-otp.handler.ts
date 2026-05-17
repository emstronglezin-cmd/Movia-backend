import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VerifyOtpCommand } from '../commands/verify-otp.command';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { OtpService } from '../../infrastructure/services/otp.service';

@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<VerifyOtpCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: VerifyOtpCommand) {
    const { phone, email, otp } = command;

    if (!phone && !email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }

    const user = phone
      ? await this.userRepository.findByPhone(phone)
      : await this.userRepository.findByEmail(email!);

    if (!user) throw new UnauthorizedException('Utilisateur non trouvé');

    const isValid = await this.otpService.verify(user.id, otp);
    if (!isValid) throw new UnauthorizedException('Code OTP invalide ou expiré');

    const payload = { sub: user.id, phone: user.phone ?? null, email: user.email ?? null };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone ?? null,
        email: user.email ?? null,
      },
    };
  }
}
