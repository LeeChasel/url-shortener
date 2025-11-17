import { Injectable, Logger } from '@nestjs/common';
import { UrlCleanupService } from 'src/url/url-cleanup.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from 'src/libs';

@Injectable()
export class CleanUpUrlsTask {
  private readonly logger = new Logger(CleanUpUrlsTask.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly urlCleanupService: UrlCleanupService,
  ) {
    this.isEnabled = this.config.get('ENABLE_SCHEDULER');
  }

  @Cron('0 0 2 * * *') // Every day at 2 AM
  async handleCleanup() {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Starting cleanup expired URLs task');
    const startTime = Date.now();

    try {
      const deletedCount = await this.urlCleanupService.softDeleteExpiredUrls();

      const duration = Date.now() - startTime;

      // Log a warning if the operation took too long or deleted too many records
      if (duration > 10000 || deletedCount > 1000) {
        this.logger.warn(
          `Large cleanup operation detected: ${deletedCount} URLs deleted in ${duration}ms. Consider batch processing if performance issues arise.`,
        );
      }

      this.logger.log(
        `Cleanup task completed: ${deletedCount} URLs soft deleted in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Cleanup task failed', error);
    }
  }

  async triggerManualCleanup() {
    this.logger.log('Manually cleanup triggered');
    return this.handleCleanup();
  }
}
