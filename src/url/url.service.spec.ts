import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, type Url } from 'generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { ConfigService, PrismaService } from 'src/libs';
import { mockLogger, restoreLogger } from 'src/libs/test-helpers';
import { UrlService } from './url.service';

jest.mock('nanoid', () => ({
  nanoid: jest.fn(),
}));

const NOW = new Date('2025-11-18');
const EXPIRES_IN_1H = new Date(NOW.getTime() + 60 * 60 * 1000);
const EXPIRES_IN_24H = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
const EXPIRES_IN_48H = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);
const NEGATIVE_CACHE_VALUE = '__NOT_FOUND__';
const NEGATIVE_CACHE_TTL = 15000;

describe('UrlService', () => {
  let service: UrlService;
  let prismaService: DeepMockProxy<PrismaService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        BASE_URL: 'http://localhost:3000',
      };

      return config[key];
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const createMockUrl = (overrides?: Partial<Url>): Url => ({
    id: 1,
    shortCode: 'abc123',
    originalUrl: 'https://example.com',
    deleted: false,
    clickCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    expiresAt: EXPIRES_IN_24H,
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const module = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get(UrlService);
    prismaService = module.get(PrismaService);

    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
    prismaService.url.findUnique.mockResolvedValue(null);

    mockLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    restoreLogger();
  });

  describe('isReservedShortCode', () => {
    it('should return true for reserved short codes', () => {
      expect(service.isReservedShortCode('api/')).toBe(true);
      expect(service.isReservedShortCode('API/')).toBe(true);
      expect(service.isReservedShortCode('health')).toBe(true);
      expect(service.isReservedShortCode('HEALTH')).toBe(true);
    });

    it('should return false for non-reserved short codes', () => {
      expect(service.isReservedShortCode('abc123')).toBe(false);
      expect(service.isReservedShortCode('xyz789')).toBe(false);
      expect(service.isReservedShortCode('api')).toBe(false);
      expect(service.isReservedShortCode('urls')).toBe(false);
    });
  });

  describe('isValidShortCode', () => {
    it('should return true for valid 6-character short codes', () => {
      expect(service.isValidShortCode('abc123')).toBe(true);
      expect(service.isValidShortCode('XYZ789')).toBe(true);
      expect(service.isValidShortCode('a-b_c1')).toBe(true);
      expect(service.isValidShortCode('ABC-12')).toBe(true);
    });

    it('should return false for invalid short codes', () => {
      expect(service.isValidShortCode('abc')).toBe(false); // Too short
      expect(service.isValidShortCode('abc1234')).toBe(false); // Too long
      expect(service.isValidShortCode('abc 12')).toBe(false); // Contains space
      expect(service.isValidShortCode('abc@12')).toBe(false); // Contains special char
      expect(service.isValidShortCode('')).toBe(false); // Empty string
    });
  });

  describe('createShortUrl', () => {
    const mockUrl = createMockUrl();

    beforeEach(() => {
      (nanoid as jest.Mock).mockReturnValue('abc123');
      prismaService.url.create.mockResolvedValue(mockUrl);
    });

    it('should create a short URL with default expiry', async () => {
      const result = await service.createShortUrl('https://example.com');

      expect(result).toMatchObject({
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        shortUrl: 'http://localhost:3000/abc123',
      });
      expect(prismaService.url.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc123',
          originalUrl: 'https://example.com',
          expiresAt: EXPIRES_IN_24H,
        },
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should create a short URL with custom expiry', async () => {
      const result = await service.createShortUrl('https://example.com', 48);

      expect(result).toMatchObject({
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
      });
      expect(prismaService.url.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc123',
          originalUrl: 'https://example.com',
          expiresAt: EXPIRES_IN_48H,
        },
      });
    });

    it('should retry if short code already exists', async () => {
      (nanoid as jest.Mock)
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('abc123');

      prismaService.url.findUnique
        .mockResolvedValueOnce({ shortCode: 'exists' } as any)
        .mockResolvedValueOnce(null);

      const result = await service.createShortUrl('https://example.com');

      expect(result.shortCode).toBe('abc123');
    });

    it('should skip reserved short codes', async () => {
      (nanoid as jest.Mock)
        .mockReturnValueOnce('health')
        .mockReturnValueOnce('abc123');

      const result = await service.createShortUrl('https://example.com');

      expect(result.shortCode).toBe('abc123');
    });

    it('should throw error if unique short code cannot be generated', async () => {
      (nanoid as jest.Mock).mockReturnValue('exists');
      prismaService.url.findUnique.mockResolvedValue({
        shortCode: 'exists',
      } as any);

      await expect(
        service.createShortUrl('https://example.com'),
      ).rejects.toThrow(
        new HttpException(
          'Could not generate a unique short code now. Please try again',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should throw CONFLICT error if Prisma unique constraint fails', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );

      prismaService.url.create.mockRejectedValue(prismaError);

      await expect(
        service.createShortUrl('https://example.com'),
      ).rejects.toMatchObject({
        message: 'Short code already exists. Please try again',
        status: HttpStatus.CONFLICT,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      const error = new Error('Database connection failed');
      prismaService.url.create.mockRejectedValue(error);

      await expect(
        service.createShortUrl('https://example.com'),
      ).rejects.toMatchObject({
        message: 'Failed to create short URL',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should cache the URL after creation', async () => {
      await service.createShortUrl('https://example.com');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'url:abc123',
        'https://example.com',
        expect.any(Number),
      );
    });

    it('should not fail if caching fails', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      const result = await service.createShortUrl('https://example.com');

      expect(result).toMatchObject({
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
      });
    });
  });

  describe('findByShortCode', () => {
    const mockUrl = createMockUrl();

    it('should return cached URL if available', async () => {
      mockCacheManager.get.mockResolvedValue('https://cached.com');

      const result = await service.findByShortCode('abc123');

      expect(result).toBe('https://cached.com');
      expect(mockCacheManager.get).toHaveBeenCalledWith('url:abc123');
      expect(prismaService.url.findUnique).not.toHaveBeenCalled();
    });

    it('should return null for negative cache hit', async () => {
      mockCacheManager.get.mockResolvedValue('__NOT_FOUND__');

      const result = await service.findByShortCode('abc123');

      expect(result).toBeNull();
      expect(prismaService.url.findUnique).not.toHaveBeenCalled();
    });

    it('should query database on cache miss and cache the result', async () => {
      prismaService.url.findUnique.mockResolvedValue(mockUrl);

      const result = await service.findByShortCode('abc123');

      expect(result).toBe('https://example.com');
      expect(prismaService.url.findUnique).toHaveBeenCalledWith({
        where: { shortCode: 'abc123', deleted: false },
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'url:abc123',
        'https://example.com',
        expect.any(Number),
      );
    });

    it('should return null and cache negative result if URL not found', async () => {
      const result = await service.findByShortCode('notfound');

      expect(result).toBeNull();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'url:notfound',
        '__NOT_FOUND__',
        NEGATIVE_CACHE_TTL,
      );
    });

    it('should treat expired URL as not found and cache negative result', async () => {
      const expiredUrl = {
        ...mockUrl,
        expiresAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000), // Expired yesterday
      };
      prismaService.url.findUnique.mockResolvedValue(expiredUrl);

      const result = await service.findByShortCode('abc123');

      expect(result).toBeNull();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'url:abc123',
        NEGATIVE_CACHE_VALUE,
        NEGATIVE_CACHE_TTL,
      );
    });

    it('should not fail if caching fails during lookup', async () => {
      prismaService.url.findUnique.mockResolvedValue(mockUrl);
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      const result = await service.findByShortCode('abc123');

      expect(result).toBe('https://example.com');
    });

    it('should calculate cache TTL correctly', async () => {
      const futureUrl = {
        ...mockUrl,
        expiresAt: EXPIRES_IN_1H,
      };

      prismaService.url.findUnique.mockResolvedValue(futureUrl);

      await service.findByShortCode('abc123');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'url:abc123',
        'https://example.com',
        60 * 60 * 1000,
      );
    });
  });
});
