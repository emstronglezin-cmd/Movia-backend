import { IsString, IsOptional, Length, Matches, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiPropertyOptional({ example: '+22601020304' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Format de numéro invalide' })
  phone?: string;

  @ApiPropertyOptional({ example: 'jkossouvi@gmail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Format email invalide' })
  email?: string;

  @ApiPropertyOptional({ example: 'B10488329', description: 'Ignoré à la vérification, validé à l\'initiation' })
  @IsOptional()
  @IsString()
  cnib?: string;

  // Champ principal attendu par les apps Flutter (nouveau nom)
  @ApiPropertyOptional({ example: '123456', description: 'Code OTP à 6 chiffres (champ "code")' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Le code OTP doit avoir 6 chiffres' })
  code?: string;

  // Champ legacy (rétro-compatibilité avec ancienne implémentation)
  @ApiPropertyOptional({ example: '123456', description: 'Code OTP à 6 chiffres (champ "otp", alias de "code")' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Le code OTP doit avoir 6 chiffres' })
  otp?: string;
}
