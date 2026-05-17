import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePackageDto } from './application/dtos/create-package.dto';
import { CreatePackageCommand } from './application/commands/create-package.command';
import { GetMyPackagesQuery } from './application/queries/get-my-packages.query';
import { GetPackageQuery } from './application/queries/get-package.query';

@ApiTags('Packages')
@Controller('packages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PackagesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Envoyer un colis' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePackageDto) {
    return this.commandBus.execute(
      new CreatePackageCommand(
        user.id, dto.companyId, dto.from, dto.to, dto.fromStation, dto.toStation,
        dto.senderName, dto.senderPhone, dto.recipientName, dto.recipientPhone,
        dto.description, dto.weight,
      ),
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes colis' })
  myPackages(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetMyPackagesQuery(user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un colis' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetPackageQuery(id, user.id));
  }
}
