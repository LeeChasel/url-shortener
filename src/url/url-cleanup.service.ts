import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs';

@Injectable()
export class UrlCleanupService {
  private readonly logger = new Logger(UrlCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async softDeleteExpiredUrls(): Promise<number> {
    try {
      const result = await this.prisma.url.updateMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
          deleted: false,
        },
        data: {
          deleted: true,
        },
      });

      this.logger.log(`Soft deleted ${result.count} expired URLs.`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to soft delete expired URLs', error);
      throw error;
    }
  }
}
