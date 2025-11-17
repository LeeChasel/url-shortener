import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs';
import { UrlService } from 'src/url';

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urlService: UrlService,
  ) {}
  private readonly logger = new Logger(RedirectService.name);

  private async trackAnalytics(shortCode: string): Promise<void> {
    // TODO: use queue system for better performance and reliability
    await this.prisma.url.update({
      where: { shortCode: shortCode },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });
  }

  async processRedirect(shortCode: string): Promise<string | null> {
    const url = await this.urlService.findByShortCode(shortCode);

    if (!url) {
      return null;
    }

    this.trackAnalytics(shortCode).catch((error) => {
      this.logger.error(
        { error: error as Error, shortCode },
        'Failed to track analytics',
      );
    });
    this.logger.log(`Redirecting short code: ${shortCode} to ${url}`);

    return url;
  }
}
