import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PackagesController } from './packages.controller';
import { CreatePackageHandler } from './application/handlers/create-package.handler';
import { GetMyPackagesHandler } from './application/handlers/get-my-packages.handler';
import { GetPackageHandler } from './application/handlers/get-package.handler';

@Module({
  imports: [CqrsModule],
  controllers: [PackagesController],
  providers: [CreatePackageHandler, GetMyPackagesHandler, GetPackageHandler],
})
export class PackagesModule {}
