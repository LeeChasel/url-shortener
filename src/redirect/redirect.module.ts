import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { UrlModule } from 'src/url';

@Module({
  controllers: [RedirectController],
  imports: [UrlModule],
  providers: [RedirectService],
})
export class RedirectModule {}
