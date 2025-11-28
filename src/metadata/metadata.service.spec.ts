import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { FetchStatus } from 'generated/prisma';
import { PrismaService } from 'src/libs';
import {
  createMockCacheManager,
  createMockPrismaService,
  mockLogger,
  createMockMetadataFetcher,
  createMockOpenGraphMetadata,
  type MockCacheManager,
  type MockPrismaService,
  type MockMetadataFetcher,
  restoreLogger,
} from 'src/libs/test-helpers';
import { MetadataService } from './metadata.service';
import { METADATA_FETCHER } from './interfaces';
import type { MetadataJobData } from './types';

const NOW = new Date('2025-11-25');

describe('MetadataService', () => {
  let service: MetadataService;
  let prismaService: MockPrismaService;
  let cacheManager: MockCacheManager;
  let mockMetadataFetcher: MockMetadataFetcher;

  const POSITIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  const NEGATIVE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  const NEGATIVE_CACHE_VALUE = '__NO_METADATA__';

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    prismaService = createMockPrismaService();
    cacheManager = createMockCacheManager();
    mockMetadataFetcher = createMockMetadataFetcher();

    const module = await Test.createTestingModule({
      providers: [
        MetadataService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: METADATA_FETCHER,
          useValue: mockMetadataFetcher,
        },
      ],
    }).compile();

    service = module.get(MetadataService);

    cacheManager.get.mockResolvedValue(null);
    cacheManager.set.mockResolvedValue(undefined);

    mockLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    restoreLogger();
  });

  describe('fetchAndStoreMetadata', () => {
    const jobData: MetadataJobData<'metadata:fetch'> = {
      urlId: 1,
      url: 'https://example.com',
    };

    it('should successfully fetch and store metadata', async () => {
      const metadata = createMockOpenGraphMetadata();

      mockMetadataFetcher.fetchMetadata.mockResolvedValue({
        status: FetchStatus.SUCCESS,
        metadata,
      });

      await service.fetchAndStoreMetadata(jobData);

      expect(mockMetadataFetcher.fetchMetadata).toHaveBeenCalledWith(
        'https://example.com',
      );
      expect(prismaService.metaData.upsert).toHaveBeenCalledWith({
        where: { urlId: 1 },
        create: {
          urlId: 1,
          title: 'Example Title',
          description: 'Example Description',
          image: 'https://example.com/image.jpg',
          siteName: 'Example Site',
          type: 'website',
          locale: 'en_US',
          fetchStatus: FetchStatus.SUCCESS,
          failureReason: undefined,
          fetchedAt: NOW,
        },
        update: {
          title: 'Example Title',
          description: 'Example Description',
          image: 'https://example.com/image.jpg',
          siteName: 'Example Site',
          type: 'website',
          locale: 'en_US',
          fetchStatus: FetchStatus.SUCCESS,
          failureReason: undefined,
          fetchedAt: NOW,
        },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        metadata,
        POSITIVE_CACHE_TTL_MS,
      );
    });

    it('should handle metadata with partial fields', async () => {
      const metadata = createMockOpenGraphMetadata({
        image: undefined,
        siteName: undefined,
        type: undefined,
        locale: undefined,
      });

      mockMetadataFetcher.fetchMetadata.mockResolvedValue({
        status: FetchStatus.SUCCESS,
        metadata,
      });

      await service.fetchAndStoreMetadata(jobData);

      expect(prismaService.metaData.upsert).toHaveBeenCalledWith({
        where: { urlId: 1 },
        create: expect.objectContaining({
          title: 'Example Title',
          description: 'Example Description',
          image: undefined,
          siteName: undefined,
          type: undefined,
          locale: undefined,
          fetchStatus: FetchStatus.SUCCESS,
        }),
        update: expect.objectContaining({
          title: 'Example Title',
          description: 'Example Description',
          fetchStatus: FetchStatus.SUCCESS,
        }),
      });
    });

    it('should handle case when no metadata is found', async () => {
      mockMetadataFetcher.fetchMetadata.mockResolvedValue({
        status: FetchStatus.NO_METADATA,
      });

      await service.fetchAndStoreMetadata(jobData);

      expect(prismaService.metaData.upsert).toHaveBeenCalledWith({
        where: { urlId: 1 },
        create: expect.objectContaining({
          fetchStatus: FetchStatus.NO_METADATA,
        }),
        update: expect.objectContaining({
          fetchStatus: FetchStatus.NO_METADATA,
        }),
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        NEGATIVE_CACHE_VALUE,
        NEGATIVE_CACHE_TTL_MS,
      );
    });

    it('should handle fetch failure', async () => {
      mockMetadataFetcher.fetchMetadata.mockResolvedValue({
        status: FetchStatus.FAILED,
        error: new Error('Network error'),
      });

      await service.fetchAndStoreMetadata(jobData);

      expect(prismaService.metaData.upsert).toHaveBeenCalledWith({
        where: { urlId: 1 },
        create: expect.objectContaining({
          fetchStatus: FetchStatus.FAILED,
          failureReason: 'Network error',
        }),
        update: expect.objectContaining({
          fetchStatus: FetchStatus.FAILED,
          failureReason: 'Network error',
        }),
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        NEGATIVE_CACHE_VALUE,
        NEGATIVE_CACHE_TTL_MS,
      );
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockMetadataFetcher.fetchMetadata.mockRejectedValue(error);

      await service.fetchAndStoreMetadata(jobData);

      expect(prismaService.metaData.upsert).toHaveBeenCalledWith({
        where: { urlId: 1 },
        create: expect.objectContaining({
          fetchStatus: FetchStatus.FAILED,
          failureReason: 'Unexpected error',
        }),
        update: expect.objectContaining({
          fetchStatus: FetchStatus.FAILED,
          failureReason: 'Unexpected error',
        }),
      });
    });

    it('should not fail if caching fails', async () => {
      const metadata = createMockOpenGraphMetadata({
        image: undefined,
        siteName: undefined,
        type: undefined,
        locale: undefined,
      });

      mockMetadataFetcher.fetchMetadata.mockResolvedValue({
        status: FetchStatus.SUCCESS,
        metadata,
      });
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.fetchAndStoreMetadata(jobData),
      ).resolves.not.toThrow();
    });
  });

  describe('getMetadata', () => {
    const urlId = 1;

    it('should return cached metadata when available', async () => {
      const metadata = createMockOpenGraphMetadata({
        title: 'Cached Title',
        description: 'Cached Description',
        image: undefined,
        siteName: undefined,
        type: undefined,
        locale: undefined,
      });
      cacheManager.get.mockResolvedValue(metadata);

      const result = await service.getMetadata(urlId);

      expect(result).toEqual(metadata);
      expect(cacheManager.get).toHaveBeenCalledWith('metadata:1');
      expect(prismaService.metaData.findUnique).not.toHaveBeenCalled();
    });

    it('should return null for negative cache hit', async () => {
      cacheManager.get.mockResolvedValue(NEGATIVE_CACHE_VALUE);

      const result = await service.getMetadata(urlId);

      expect(result).toBeNull();
      expect(prismaService.metaData.findUnique).not.toHaveBeenCalled();
    });

    it('should query database on cache miss and cache the result', async () => {
      const dbMetadata = {
        id: 1,
        urlId: 1,
        title: 'DB Title',
        description: 'DB Description',
        image: 'https://example.com/image.jpg',
        siteName: 'Example',
        type: 'website',
        locale: 'en_US',
        fetchStatus: FetchStatus.SUCCESS,
        failureReason: null,
        fetchedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      };

      prismaService.metaData.findUnique.mockResolvedValue(dbMetadata);

      const result = await service.getMetadata(urlId);

      expect(result).toEqual({
        title: 'DB Title',
        description: 'DB Description',
        image: 'https://example.com/image.jpg',
        siteName: 'Example',
        type: 'website',
        locale: 'en_US',
      });
      expect(prismaService.metaData.findUnique).toHaveBeenCalledWith({
        where: { urlId: 1 },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        {
          title: 'DB Title',
          description: 'DB Description',
          image: 'https://example.com/image.jpg',
          siteName: 'Example',
          type: 'website',
          locale: 'en_US',
        },
        POSITIVE_CACHE_TTL_MS,
      );
    });

    it('should return null and cache negative result if metadata not found', async () => {
      prismaService.metaData.findUnique.mockResolvedValue(null);

      const result = await service.getMetadata(urlId);

      expect(result).toBeNull();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        NEGATIVE_CACHE_VALUE,
        NEGATIVE_CACHE_TTL_MS,
      );
    });

    it('should return null and cache negative result if fetch status is not SUCCESS', async () => {
      const dbMetadata = {
        id: 1,
        urlId: 1,
        title: null,
        description: null,
        image: null,
        siteName: null,
        type: null,
        locale: null,
        fetchStatus: FetchStatus.FAILED,
        failureReason: 'Network error',
        fetchedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      };

      prismaService.metaData.findUnique.mockResolvedValue(dbMetadata);

      const result = await service.getMetadata(urlId);

      expect(result).toBeNull();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'metadata:1',
        NEGATIVE_CACHE_VALUE,
        NEGATIVE_CACHE_TTL_MS,
      );
    });

    it('should handle null fields in database metadata', async () => {
      const dbMetadata = {
        id: 1,
        urlId: 1,
        title: 'Title Only',
        description: null,
        image: null,
        siteName: null,
        type: null,
        locale: null,
        fetchStatus: FetchStatus.SUCCESS,
        failureReason: null,
        fetchedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      };

      prismaService.metaData.findUnique.mockResolvedValue(dbMetadata);

      const result = await service.getMetadata(urlId);

      expect(result).toEqual({
        title: 'Title Only',
        description: '',
        image: undefined,
        siteName: undefined,
        type: undefined,
        locale: undefined,
      });
    });

    it('should not fail if caching fails during lookup', async () => {
      const dbMetadata = {
        id: 1,
        urlId: 1,
        title: 'Title',
        description: null,
        image: null,
        siteName: null,
        type: null,
        locale: null,
        fetchStatus: FetchStatus.SUCCESS,
        failureReason: null,
        fetchedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      };

      prismaService.metaData.findUnique.mockResolvedValue(dbMetadata);
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      const result = await service.getMetadata(urlId);

      expect(result).toEqual({
        title: 'Title',
        description: '',
        image: undefined,
        siteName: undefined,
        type: undefined,
        locale: undefined,
      });
    });
  });
});
