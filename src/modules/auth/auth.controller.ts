import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { InitiateAuthDto } from './application/dtos/initiate-auth.dto';
import { VerifyOtpDto } from './application/dtos/verify-otp.dto';
import { UpdateProfileDto } from './application/dtos/update-profile.dto';
import { VerifyEmailDto } from './application/dtos/verify-email.dto';
import { InitiateAuthCommand } from './application/commands/initiate-auth.command';
import { VerifyOtpCommand } from './application/commands/verify-otp.command';
import { GetMeQuery } from './application/queries/get-me.query';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { OtpService } from './infrastructure/services/otp.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly uploadService: UploadService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    private readonly userRepository: PrismaUserRepository,
  ) {}

  // ─── ROUTES PRINCIPALES (noms utilisés par les apps Flutter) ──────────────

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Envoyer OTP (initier authentification)' })
  sendOtp(@Body() dto: InitiateAuthDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }
    return this.commandBus.execute(new InitiateAuthCommand(dto.phone, dto.name, dto.email, dto.cnib));
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Vérifier OTP et obtenir JWT' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }
    // Accepter "code" ou "otp" (compatibilité entre apps Flutter et ancienne API)
    const otpCode = dto.code ?? dto.otp;
    if (!otpCode) {
      throw new BadRequestException('Le code OTP est requis');
    }
    return this.commandBus.execute(new VerifyOtpCommand(dto.phone, otpCode, dto.email));
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil utilisateur courant (GET /auth/profile)' })
  profile(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetMeQuery(user.id));
  }

  // ─── ROUTES ALIAS (rétro-compatibilité) ───────────────────────────────────

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '[Alias] Initier authentification (envoie OTP)' })
  initiate(@Body() dto: InitiateAuthDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }
    return this.commandBus.execute(new InitiateAuthCommand(dto.phone, dto.name, dto.email, dto.cnib));
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '[Alias] Vérifier OTP et obtenir JWT' })
  verify(@Body() dto: VerifyOtpDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Un numéro de téléphone ou un email est requis');
    }
    const otpCode = dto.code ?? dto.otp;
    if (!otpCode) {
      throw new BadRequestException('Le code OTP est requis');
    }
    return this.commandBus.execute(new VerifyOtpCommand(dto.phone, otpCode, dto.email));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Alias] Profil utilisateur courant (GET /auth/me)' })
  me(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetMeQuery(user.id));
  }

  // ─── GESTION PROFIL ────────────────────────────────────────────────────────

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour le profil (nom, email)' })
  async updateProfile(
    @CurrentUser() currentUser: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.userRepository.update(currentUser.id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.email && { email: dto.email }),
    });
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone ?? null,
      email: updated.email ?? null,
      avatarUrl: updated.avatarUrl ?? null,
      emailVerified: updated.emailVerified,
    };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Uploader une photo de profil (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser() currentUser: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Fichier doit être une image');

    const url = await this.uploadService.uploadAvatar(file.buffer, currentUser.id);
    const updated = await this.userRepository.update(currentUser.id, { avatarUrl: url });

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone ?? null,
      email: updated.email ?? null,
      avatarUrl: url,
      emailVerified: updated.emailVerified,
    };
  }

  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Envoyer OTP de vérification email' })
  async sendVerificationEmail(@CurrentUser() currentUser: { id: string }) {
    const user = await this.userRepository.findById(currentUser.id);
    if (!user) throw new BadRequestException('Utilisateur non trouvé');
    if (!user.email) throw new BadRequestException('Aucun email associé au compte');
    if (user.emailVerified) throw new BadRequestException('Email déjà vérifié');

    const { code } = await this.otpService.generateAndSave(user.id);
    await this.emailService.sendEmailVerification(user.email, code, user.name);

    return { message: 'Code de vérification envoyé', ...(process.env.NODE_ENV !== 'production' && { otp: code }) };
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier email avec OTP' })
  async verifyEmail(
    @CurrentUser() currentUser: { id: string },
    @Body() dto: VerifyEmailDto,
  ) {
    const valid = await this.otpService.verify(currentUser.id, dto.otp);
    if (!valid) throw new BadRequestException('Code invalide ou expiré');

    const updated = await this.userRepository.update(currentUser.id, { emailVerified: true });
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone ?? null,
      email: updated.email ?? null,
      avatarUrl: updated.avatarUrl ?? null,
      emailVerified: true,
    };
  }
}
