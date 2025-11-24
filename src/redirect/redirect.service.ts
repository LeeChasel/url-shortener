import { Injectable, Logger } from '@nestjs/common';
import { UrlService, UrlQueueProducer } from 'src/url';

@Injectable()
export class RedirectService {
  constructor(
    private readonly urlService: UrlService,
    private readonly urlQueueProducer: UrlQueueProducer,
  ) {}
  private readonly logger = new Logger(RedirectService.name);

  async processRedirect(shortCode: string): Promise<string | null> {
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
    this.logger.log(`Redirecting short code: ${shortCode} to ${url}`);

    return url;
  }
}
