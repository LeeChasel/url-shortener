import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService, PrismaService } from 'src/libs';
import { nanoid } from 'nanoid';
import { addHours } from 'date-fns';
import { Prisma } from 'generated/prisma';
import { UrlResponseDto } from './dto';

@Injectable()
export class UrlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  private readonly logger = new Logger(UrlService.name);
  private readonly DEFAULT_EXPIRY_HOURS = 24;

  async createShortUrl(
    originalUrl: string,
    expiryInHours = this.DEFAULT_EXPIRY_HOURS,
  ): Promise<UrlResponseDto> {
    const shortCode = await this.generateUniqueShortCode();
    const expiryDate = addHours(new Date(), expiryInHours);

    try {
      const [url] = await Promise.all([
        this.prisma.url.create({
          data: {
            shortCode: shortCode,
            originalUrl: originalUrl,
            expiresAt: expiryDate,
          },
        }),
        this.cacheUrl(shortCode, originalUrl, expiryDate),
      ]);
      this.logger.log(`Created short code: ${shortCode} for ${originalUrl}`);

      return new UrlResponseDto({
        shortCode: url.shortCode,
        shortUrl: this.generateShortUrl(url.shortCode),
        originalUrl: url.originalUrl,
        expiresAt: url.expiresAt!,
        createdAt: url.createdAt,
        updatedAt: url.updatedAt,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpException(
            'Short code already exists. Please try again',
            HttpStatus.CONFLICT,
            { cause: error },
          );
        }
      }

      throw new HttpException(
        'Failed to create short URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: error },
      );
    }
  }

  private async generateUniqueShortCode(): Promise<string> {
    // Prevent shortCode collisions by checking existing codes
    const RETRY_LIMIT = 5;
    for (let i = 0; i < RETRY_LIMIT; i++) {
      const shortCode = nanoid(6);
      const exists = await this.prisma.url.findUnique({
        where: { shortCode: shortCode },
      });

      if (!exists) {
        return shortCode;
      }
    }

    throw new HttpException(
      'Could not generate a unique short code now. Please try again',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async cacheUrl(
    shortCode: string,
    originalUrl: string,
    expiresAt: Date,
  ) {
    const cacheKey = `url:${shortCode}`;
    const ttlMilliseconds = Math.floor(expiresAt.getTime() - Date.now());
    if (ttlMilliseconds <= 0) {
      return; // Do not cache expired URLs
    }

    try {
      await this.cacheManager.set(cacheKey, originalUrl, ttlMilliseconds);
    } catch (error) {
      this.logger.warn({ error, shortCode }, 'Failed to write URL to cache');
    }
  }

  private generateShortUrl(shortCode: string): string {
    return `${this.config.get('BASE_URL')}/${shortCode}`;
  }
}
