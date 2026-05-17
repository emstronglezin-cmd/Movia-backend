import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchTripsQuery } from './application/queries/search-trips.query';
import { GetTripSeatsQuery } from './application/queries/get-trip-seats.query';
import { GetTripByIdQuery } from './application/queries/get-trip-by-id.query';
import { SearchTripsDto } from './application/dtos/search-trips.dto';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des trajets disponibles avec filtrage intelligent des horaires' })
  search(@Query() dto: SearchTripsDto) {
    const today = new Date().toISOString().split('T')[0];
    let effectiveDepartureAfter = dto.departureAfter;

    if (!effectiveDepartureAfter && dto.date === today) {
      const now = new Date();
      const bufferMinutes = 90;
      const minutesTotal = now.getHours() * 60 + now.getMinutes() - bufferMinutes;
      const clampedMinutes = Math.max(0, minutesTotal);
      const h = Math.floor(clampedMinutes / 60);
      const m = clampedMinutes % 60;
      effectiveDepartureAfter = `${h}:${m.toString().padStart(2, '0')}`;
    }

    return this.queryBus.execute(
      new SearchTripsQuery(
        dto.from,
        dto.to,
        dto.date,
        parseInt(dto.passengers || '1'),
        effectiveDepartureAfter,
      ),
    );
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Disponibilité des sièges pour un trajet' })
  seats(@Param('id') id: string) {
    return this.queryBus.execute(new GetTripSeatsQuery(id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un trajet' })
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetTripByIdQuery(id));
  }
}
