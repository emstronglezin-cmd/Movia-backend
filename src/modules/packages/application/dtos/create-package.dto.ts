import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty({ example: 'elitis' })
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'Ouagadougou' })
  @IsString()
  from: string;

  @ApiProperty({ example: 'Bobo Dioulasso' })
  @IsString()
  to: string;

  @ApiProperty({ example: 'Gare de la ZAD' })
  @IsString()
  fromStation: string;

  @ApiProperty({ example: 'Gare Secteur 25' })
  @IsString()
  toStation: string;

  @ApiProperty({ example: 'Alassane Sira' })
  @IsString()
  senderName: string;

  @ApiProperty({ example: '+22601020304' })
  @IsString()
  senderPhone: string;

  @ApiProperty({ example: 'Ibrahim Diallo' })
  @IsString()
  recipientName: string;

  @ApiProperty({ example: '+22605060708' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ example: 'Vêtements et accessoires' })
  @IsString()
  @MinLength(3)
  description: string;

  @ApiProperty({ example: '2.5 kg' })
  @IsString()
  weight: string;
}
