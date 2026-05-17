import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// bookingMode: 'pay_now' = paiement immédiat (défaut), 'reserve_only' = payer à la gare

export class CreateBookingDto {
  @ApiProperty({ example: 'trip_id_here' })
  @IsString()
  tripId: string;

  @ApiProperty({ example: 'Alassane Sira' })
  @IsString()
  passengerName: string;

  @ApiProperty({ example: '+22601020304' })
  @IsString()
  passengerPhone: string;

  @ApiPropertyOptional({ example: 'B10488329', description: 'Numéro CNIB du passager' })
  @IsOptional()
  @IsString()
  passengerCnib?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  seatNumber: number;

  @ApiPropertyOptional({ example: 'orange_money', enum: ['orange_money', 'moov_money'] })
  @IsOptional()
  @IsString()
  paymentProvider?: string;

  @ApiPropertyOptional({ description: 'true = réserver sans payer (paiement à la gare)' })
  @IsOptional()
  @IsBoolean()
  skipPayment?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRoundTrip?: boolean;

  @ApiPropertyOptional({ example: '2026-05-15' })
  @IsOptional()
  @IsString()
  returnDate?: string;

  @ApiPropertyOptional({ example: '7:00' })
  @IsOptional()
  @IsString()
  returnDepartureTime?: string;

  @ApiPropertyOptional({ example: '12:30' })
  @IsOptional()
  @IsString()
  returnArrivalTime?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  returnSeatNumber?: number;

  @ApiPropertyOptional({ example: '15', description: 'Poids des bagages en kg' })
  @IsOptional()
  @IsString()
  baggageWeight?: string;
}
