import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, Min, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PassengerBookingDto {
  @ApiProperty({ example: 'Alassane Sira' })
  @IsString()
  passengerName: string;

  @ApiProperty({ example: '+22601020304' })
  @IsString()
  passengerPhone: string;

  @ApiPropertyOptional({ example: 'B10488329' })
  @IsOptional()
  @IsString()
  passengerCnib?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  seatNumber: number;

  @ApiPropertyOptional({ example: '15' })
  @IsOptional()
  @IsString()
  baggageWeight?: string;
}

export class CreateBatchBookingDto {
  @ApiProperty({ example: 'trip_id_here' })
  @IsString()
  tripId: string;

  @ApiProperty({ type: [PassengerBookingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerBookingDto)
  passengers: PassengerBookingDto[];

  @ApiPropertyOptional({ example: 'orange_money', enum: ['orange_money', 'moov_money'] })
  @IsOptional()
  @IsString()
  paymentProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  skipPayment?: boolean;

  @ApiPropertyOptional()
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
}
