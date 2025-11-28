import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs';
import { FetchStatus } from 'generated/prisma';
import { MetadataJobData, OpenGraphMetadata } from './types';
import {
  METADATA_FETCHER,
  type MetadataFetcher,
} from './interfaces/metadata-fetcher.interface';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  // Cache TTLs
  private readonly POSITIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly NEGATIVE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly NEGATIVE_CACHE_VALUE = '__NO_METADATA__';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(METADATA_FETCHER)
    private readonly metadataFetcher: MetadataFetcher,
  ) {}

  async fetchAndStoreMetadata(
    data: MetadataJobData<'metadata:fetch'>,
  ): Promise<void> {
    const { urlId, url } = data;

    try {
      const fetchResult = await this.metadataFetcher.fetchMetadata(url);

      if (fetchResult.status === 'SUCCESS') {
        await this.saveMetadata(
          urlId,
          fetchResult.metadata,
          FetchStatus.SUCCESS,
        );
        void this.cacheMetadata(urlId, fetchResult.metadata);
        this.logger.log(`Fetched metadata for URL id ${urlId}`);
      } else if (fetchResult.status === 'NO_METADATA') {
        await this.saveMetadata(urlId, {}, FetchStatus.NO_METADATA);
        void this.cacheNegative(urlId);
        this.logger.debug(`No metadata found for URL id ${urlId}`);
      } else if (fetchResult.status === 'FAILED') {
        await this.saveMetadata(
          urlId,
          {},
          FetchStatus.FAILED,
          fetchResult.error.message,
        );
        void this.cacheNegative(urlId);
        this.logger.warn(
          `Failed to fetch metadata for URL id ${urlId}: ${fetchResult.error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        { error: error as Error, urlId, url },
        'Unexpected error fetching metadata',
      );
      await this.saveMetadata(
        urlId,
        {},
        FetchStatus.FAILED,
        (error as Error).message,
      );
    }
  }

  async getMetadata(urlId: number): Promise<OpenGraphMetadata | null> {
    const cacheKey = this.getCacheKey(urlId);
    const cached = await this.cacheManager.get<
      OpenGraphMetadata | typeof this.NEGATIVE_CACHE_VALUE
    >(cacheKey);

    // Check cache
    if (cached) {
      if (cached === this.NEGATIVE_CACHE_VALUE) {
        this.logger.debug(`Negative cache hit for URL id ${urlId}`);
        return null;
      }
      this.logger.debug(`Cache hit for metadata of URL id ${urlId}`);
      return cached;
    }

    this.logger.debug(`Cache miss for URL id ${urlId}, querying database`);
    const metadata = await this.prisma.metaData.findUnique({
      where: { urlId },
    });

    if (!metadata || metadata.fetchStatus !== FetchStatus.SUCCESS) {
      void this.cacheNegative(urlId);
      return null;
    }

    const ogMetadata: OpenGraphMetadata = {
      title: metadata.title ?? '',
      description: metadata.description ?? '',
      image: metadata.image ?? undefined,
      siteName: metadata.siteName ?? undefined,
      type: metadata.type ?? undefined,
      locale: metadata.locale ?? undefined,
    };

    // Cache for future requests
    void this.cacheMetadata(urlId, ogMetadata);
    return ogMetadata;
  }

  private async saveMetadata(
    urlId: number,
    metadata: Partial<OpenGraphMetadata>,
    status: FetchStatus,
    failureReason?: string,
  ): Promise<void> {
    await this.prisma.metaData.upsert({
      where: { urlId },
      create: {
        urlId,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        type: metadata.type,
        locale: metadata.locale,
        fetchStatus: status,
        failureReason,
        fetchedAt: new Date(),
      },
      update: {
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        type: metadata.type,
        locale: metadata.locale,
        fetchStatus: status,
        failureReason,
        fetchedAt: new Date(),
      },
    });
  }

  private getCacheKey(urlId: number): string {
    return `metadata:${urlId}`;
  }

  private async cacheMetadata(
    urlId: number,
    metadata: OpenGraphMetadata,
  ): Promise<void> {
    try {
      await this.cacheManager.set(
        this.getCacheKey(urlId),
        metadata,
        this.POSITIVE_CACHE_TTL_MS,
      );
    } catch (error) {
      this.logger.warn({ error, urlId }, 'Failed to cache metadata');
    }
  }

  private async cacheNegative(urlId: number): Promise<void> {
    try {
      await this.cacheManager.set(
        this.getCacheKey(urlId),
        this.NEGATIVE_CACHE_VALUE,
        this.NEGATIVE_CACHE_TTL_MS,
      );
    } catch (error) {
      this.logger.warn({ error, urlId }, 'Failed to cache negative metadata');
    }
  }
}
