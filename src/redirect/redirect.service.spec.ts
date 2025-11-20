import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/libs';
import {
  mockLogger,
  mockPrismaService,
  type MockPrismaService,
  restoreLogger,
} from 'src/libs/test-helpers';
import { UrlService } from 'src/url';
import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;
  let prismaService: MockPrismaService;

  const mockUrlService = {
    findByShortCode: jest.fn(),
  };

  const SHORT_CODE = 'abc123';
  const ORIGINAL_URL = 'https://example.com';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedirectService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UrlService,
          useValue: mockUrlService,
        },
      ],
    }).compile();

    service = module.get(RedirectService);
    prismaService = module.get(PrismaService);

    mockLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    restoreLogger();
  });

  describe('processRedirect', () => {
    it('should return original URL and trigger analytics tracking when URL exists', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(ORIGINAL_URL);
      prismaService.url.update.mockResolvedValue({} as any);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBe(ORIGINAL_URL);
      expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(SHORT_CODE);

      // wait fire-and-forget analytics execution
      await new Promise(process.nextTick);

      expect(prismaService.url.update).toHaveBeenCalledWith({
        where: { shortCode: SHORT_CODE },
        data: { clickCount: { increment: 1 } },
      });
    });

    it('should return null when URL does not exist', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(null);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBeNull();
      expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(SHORT_CODE);
      expect(prismaService.url.update).not.toHaveBeenCalled();
    });

    it('should still return URL even when analytics tracking fails', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(ORIGINAL_URL);
      prismaService.url.update.mockRejectedValue(new Error('Database error'));

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBe(ORIGINAL_URL);

      await new Promise(process.nextTick);

      expect(prismaService.url.update).toHaveBeenCalled();
    });

    it('should propagate URL service errors', async () => {
      const serviceError = new Error('URL service error');
      mockUrlService.findByShortCode.mockRejectedValue(serviceError);

      await expect(service.processRedirect(SHORT_CODE)).rejects.toThrow(
        serviceError,
      );
      expect(prismaService.url.update).not.toHaveBeenCalled();
    });
  });
});
