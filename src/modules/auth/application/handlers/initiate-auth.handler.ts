import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InitiateAuthCommand } from '../commands/initiate-auth.command';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { OtpService } from '../../infrastructure/services/otp.service';

@CommandHandler(InitiateAuthCommand)
export class InitiateAuthHandler implements ICommandHandler<InitiateAuthCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly otpService: OtpService,
  ) {}

  async execute(command: InitiateAuthCommand) {
    const { phone, email, name, cnib } = command;

    if (!phone && !email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }

    // ── Auth par téléphone ──────────────────────────────────────────────────
    if (phone) {
      let user = await this.userRepository.findByPhone(phone);
      let isNewUser = false;

      if (!user) {
        // ── INSCRIPTION ──
        // CNIB requis uniquement à l'inscription (pas à la connexion)
        if (cnib && !name) {
          throw new BadRequestException('Le nom est requis pour créer un compte');
        }

        // Si pas de nom fourni, on crée un nom par défaut basé sur le numéro
        const userName = name ?? `Utilisateur ${phone.slice(-4)}`;

        try {
          user = await this.userRepository.create({
            name: userName,
            phone,
            ...(cnib ? { cnib } : {}),
          });
          isNewUser = true;
        } catch (err: any) {
          const msg: string = err?.message ?? '';
          // Contrainte d'unicité CNIB ou téléphone (PostgreSQL)
          if (
            msg.includes('Unique constraint') ||
            msg.includes('unique constraint') ||
            msg.includes('unique') ||
            msg.includes('P2002')
          ) {
            if (msg.toLowerCase().includes('cnib')) {
              throw new BadRequestException('Ce numéro CNIB est déjà associé à un autre compte');
            }
            throw new BadRequestException('Ce numéro de téléphone est déjà associé à un autre compte');
          }
          throw err;
        }
      } else {
        // ── CONNEXION ──
        // Si CNIB fourni et utilisateur en a un, vérifier la correspondance
        if (cnib && user.cnib !== null && user.cnib !== cnib) {
          throw new UnauthorizedException('Numéro CNIB incorrect pour ce numéro de téléphone');
        }
        // Si CNIB fourni et utilisateur n'en a pas encore → lier au compte
        if (cnib && user.cnib === null) {
          await this.userRepository.update(user.id, { cnib });
        }
      }

      const { code, expiresAt } = await this.otpService.generateAndSave(user.id);
      return {
        userId: user.id,
        isNewUser,
        expiresAt,
        // En dev/staging: retourner le code OTP pour les tests
        ...(process.env.NODE_ENV !== 'production' && { otp: code }),
      };
    }

    // ── Auth par email (CNIB non requis) ──────────────────────────────────
    let user = await this.userRepository.findByEmail(email!);

    if (!user) {
      const userName = name ?? `Utilisateur ${email!.split('@')[0]}`;
      user = await this.userRepository.create({ name: userName, email });
    }

    const { code, expiresAt } = await this.otpService.generateAndSave(user.id);
    return {
      userId: user.id,
      isNewUser: false,
      expiresAt,
      ...(process.env.NODE_ENV !== 'production' && { otp: code }),
    };
  }
}
