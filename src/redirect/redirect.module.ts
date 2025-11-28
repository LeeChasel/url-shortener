import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { UrlModule } from 'src/url';
import { MetadataModule } from 'src/metadata';

@Module({
  controllers: [RedirectController],
  imports: [UrlModule, MetadataModule],
  providers: [RedirectService],
})
export class RedirectModule {}
