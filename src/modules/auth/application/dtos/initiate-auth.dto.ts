import { IsString, IsOptional, Matches, MinLength, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateAuthDto {
  @ApiPropertyOptional({ example: '+22601020304', description: 'Numéro de téléphone (requis si pas d\'email)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Format de numéro invalide' })
  phone?: string;

  @ApiPropertyOptional({ example: 'jkossouvi@gmail.com', description: 'Email (requis si pas de téléphone)' })
  @IsOptional()
  @IsEmail({}, { message: 'Format email invalide' })
  email?: string;

  @ApiPropertyOptional({ example: 'Alassane Sira', description: 'Nom complet (requis pour inscription)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'B10488329', description: 'Numéro CNIB (Carte Nationale d\'Identité Burkinabè)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,2}[0-9]{5,}$/, { message: 'Format CNIB invalide (ex: B10488329)' })
  cnib?: string;
}
