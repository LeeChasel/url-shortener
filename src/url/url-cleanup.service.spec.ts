import { Test } from '@nestjs/testing';
import { UrlCleanupService } from './url-cleanup.service';
import { PrismaService } from 'src/libs';
import {
  mockLogger,
  mockPrismaService,
  type MockPrismaService,
  restoreLogger,
} from 'src/libs/test-helpers';

describe('UrlCleanupService', () => {
  let service: UrlCleanupService;
  let prismaService: MockPrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UrlCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = moduleRef.get(UrlCleanupService);
    prismaService = moduleRef.get(PrismaService);

    mockLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    restoreLogger();
  });

  describe('softDeleteExpiredUrls', () => {
    it('should return count of soft deleted URLs', async () => {
      prismaService.url.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.softDeleteExpiredUrls();

      expect(result).toBe(5);

      expect(prismaService.url.updateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lte: expect.any(Date),
          },
          deleted: false,
        },
        data: {
          deleted: true,
        },
      });
    });

    it('should return 0 if no expired URLs found', async () => {
      prismaService.url.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.softDeleteExpiredUrls();

      expect(result).toBe(0);
    });

    it('should throw error if database operation fails', async () => {
      const error = new Error('Database error');
      prismaService.url.updateMany.mockRejectedValue(error);

      await expect(service.softDeleteExpiredUrls()).rejects.toThrow(error);
    });
  });
});
