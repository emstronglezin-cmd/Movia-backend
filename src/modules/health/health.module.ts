import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, AdminController],
})
export class HealthModule {}
