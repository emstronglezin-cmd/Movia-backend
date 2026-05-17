import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuthController } from './auth.controller';
import { InitiateAuthHandler } from './application/handlers/initiate-auth.handler';
import { VerifyOtpHandler } from './application/handlers/verify-otp.handler';
import { GetMeHandler } from './application/handlers/get-me.handler';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { OtpService } from './infrastructure/services/otp.service';
import { JwtStrategy } from './infrastructure/services/jwt.strategy';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { UploadModule } from '../upload/upload.module';
import { EmailModule } from '../email/email.module';

const CommandHandlers = [InitiateAuthHandler, VerifyOtpHandler];
const QueryHandlers = [GetMeHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') as any },
      }),
      inject: [ConfigService],
    }),
    MulterModule.register({}),
    UploadModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    OtpService,
    JwtStrategy,
    PrismaUserRepository,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
