import { IsString, IsOptional, IsNumberString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchTripsDto {
  @ApiProperty({ example: 'Ouagadougou' })
  @IsString()
  from: string;

  @ApiProperty({ example: 'Bobo Dioulasso' })
  @IsString()
  to: string;

  @ApiProperty({ example: '2026-05-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  passengers?: string;

  @ApiPropertyOptional({
    example: '14:30',
    description: 'Filtre heure départ min (HH:MM). Si absent et date = aujourd\'hui, filtre automatique -1h30 par rapport à maintenant.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/, { message: 'Format heure invalide (H:MM ou HH:MM)' })
  departureAfter?: string;
}
