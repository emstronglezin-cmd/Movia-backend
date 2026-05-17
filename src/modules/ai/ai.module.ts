import { Module, Global } from '@nestjs/common';
import { AiRiskService } from './ai-risk.service';

@Global()
@Module({
  providers: [AiRiskService],
  exports: [AiRiskService],
})
export class AiModule {}
