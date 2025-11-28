import { Injectable, Logger } from '@nestjs/common';
import { UrlService, UrlQueueProducer } from 'src/url';
import { MetadataService } from 'src/metadata/metadata.service';
import { OpenGraphMetadata } from 'src/metadata/types';

type RedirectResult = {
  url: string;
  metadata: OpenGraphMetadata | null;
};

@Injectable()
export class RedirectService {
  constructor(
    private readonly urlService: UrlService,
    private readonly urlQueueProducer: UrlQueueProducer,
    private readonly metadataService: MetadataService,
  ) {}
  private readonly logger = new Logger(RedirectService.name);

  async processRedirect(shortCode: string): Promise<RedirectResult | null> {
    const url = await this.urlService.findByShortCode(shortCode);

    if (!url) {
      return null;
    }

    await this.urlQueueProducer
      .add('url:redirected', { shortCode })
      .catch((error) => {
        this.logger.error(
          { error: error as Error, shortCode },
          'Failed to track analytics',
        );
      });

    const metadata = await this.metadataService.getMetadata(url.id);

    this.logger.log(`Redirecting short code: ${shortCode} to ${url.url}`);

    return {
      url: url.url,
      metadata: metadata,
    };
  }
}
