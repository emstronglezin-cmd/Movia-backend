import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { LoyaltyService } from './loyalty.service';

class RedeemPointsDto {
  @IsNumber()
  @Min(100)
  points: number;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('Loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Compte fidélité de l\'utilisateur courant' })
  getMyLoyalty(@Request() req: any) {
    return this.loyaltyService.getOrCreate(req.user.id);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Utiliser des points de fidélité (réduction)' })
  redeemPoints(@Request() req: any, @Body() dto: RedeemPointsDto) {
    return this.loyaltyService.redeemPoints(
      req.user.id,
      dto.points,
      dto.description ?? '',
    );
  }

  @Get('info')
  @ApiOperation({ summary: 'Infos sur la conversion des points et les avantages par niveau' })
  getConversionInfo() {
    return this.loyaltyService.getConversionInfo();
  }
}
