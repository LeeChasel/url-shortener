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
import { addHours, addMilliseconds } from 'date-fns';
import { Prisma } from 'generated/prisma';
import { UrlResponseDto } from './dto';
import { RESERVED_SHORT_CODES } from 'src/libs/modules/config/constants';
import { UrlJobData } from './types/jobs.type';

@Injectable()
export class UrlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  private readonly logger = new Logger(UrlService.name);
  private readonly DEFAULT_EXPIRY_HOURS = 24;
  private readonly POSITIVE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly SHORT_CODE_LENGTH = 6;

  // Negative cache settings
  private readonly NEGATIVE_CACHE_TTL_MS = 15 * 1000; // 15 seconds
  private readonly NEGATIVE_CACHE_VALUE = '__NOT_FOUND__';

  isReservedShortCode(shortCode: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return RESERVED_SHORT_CODES.includes(shortCode.toLowerCase() as any);
  }

  isValidShortCode(shortCode: string): boolean {
    const SHORT_CODE_REGEX = new RegExp(
      `^[A-Za-z0-9_-]{${this.SHORT_CODE_LENGTH}}$`,
    );
    return SHORT_CODE_REGEX.test(shortCode);
  }

  async createShortUrl(
    originalUrl: string,
    expiryInHours = this.DEFAULT_EXPIRY_HOURS,
  ): Promise<UrlResponseDto> {
    const shortCode = await this.generateUniqueShortCode();
    const expiryDate = addHours(new Date(), expiryInHours);
    const cacheExpiryDate = addMilliseconds(
      new Date(),
      this.POSITIVE_CACHE_TTL_MS,
    );

    try {
      const [url] = await Promise.all([
        this.prisma.url.create({
          data: {
            shortCode: shortCode,
            originalUrl: originalUrl,
            expiresAt: expiryDate,
          },
        }),
        this.cacheUrl(shortCode, originalUrl, cacheExpiryDate),
      ]);
      this.logger.log(`Created short code: ${shortCode} for ${originalUrl}`);

      return new UrlResponseDto({
        shortCode: url.shortCode,
        shortUrl: this.generateShortUrl(url.shortCode),
        originalUrl: url.originalUrl,
        expiresAt: url.expiresAt,
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
      const shortCode = nanoid(this.SHORT_CODE_LENGTH);
      if (this.isReservedShortCode(shortCode)) {
        continue;
      }

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

  private getCacheKey(shortCode: string): string {
    return `url:${shortCode}`;
  }

  private async cacheUrl(
    shortCode: string,
    originalUrl: string,
    expiresAt: Date,
  ) {
    const cacheKey = this.getCacheKey(shortCode);
    const ttlMilliseconds = Math.floor(expiresAt.getTime() - Date.now());
    if (ttlMilliseconds <= 0) {
      // Should not happen
      this.logger.warn(
        { shortCode, expiresAt, ttl: ttlMilliseconds },
        'Skipped caching Url with non-positive TTL',
      );
      return; // Do not cache expired URLs
    }

    try {
      await this.cacheManager.set(cacheKey, originalUrl, ttlMilliseconds);
    } catch (error) {
      this.logger.warn({ error, shortCode }, 'Failed to write URL to cache');
    }
  }

  private async cacheNotFound(shortCode: string) {
    const cacheKey = this.getCacheKey(shortCode);

    try {
      await this.cacheManager.set(
        cacheKey,
        this.NEGATIVE_CACHE_VALUE,
        this.NEGATIVE_CACHE_TTL_MS,
      );
      this.logger.debug(`Cached negative result for shortCode: ${shortCode}`);
    } catch (error) {
      this.logger.warn(
        { error, shortCode },
        'Failed to write negative cache for URL',
      );
    }
  }

  private generateShortUrl(shortCode: string): string {
    return `${this.config.get('BASE_URL')}/${shortCode}`;
  }

  async findByShortCode(shortCode: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(shortCode);
    const cachedUrl = await this.cacheManager.get<string>(cacheKey);

    if (cachedUrl) {
      // Handle negative cache hit, prevent unnecessary DB query
      if (cachedUrl === this.NEGATIVE_CACHE_VALUE) {
        this.logger.debug(`Negative cache hit for shortCode: ${shortCode}`);
        return null;
      }

      this.logger.debug(`Cache hit for shortCode: ${shortCode}`);
      return cachedUrl;
    }

    this.logger.debug(`Cache miss for ${shortCode}, querying database`);
    const url = await this.prisma.url.findUnique({
      where: { shortCode: shortCode, deleted: false },
    });

    if (!url) {
      void this.cacheNotFound(shortCode);
      return null;
    }

    // Negative cache for expired URLs
    if (url.expiresAt < new Date()) {
      void this.cacheNotFound(shortCode);
      return null;
    }

    // Fire and forget caching, no need to await
    void this.cacheUrl(shortCode, url.originalUrl, url.expiresAt);

    return url.originalUrl;
  }

  async redirectedStatistics(
    data: UrlJobData<'url:redirected'>,
  ): Promise<void> {
    const { shortCode } = data;

    await this.prisma.url.update({
      where: { shortCode: shortCode },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });
  }
}
