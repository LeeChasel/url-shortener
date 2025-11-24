import { Test } from '@nestjs/testing';
import {
  createMockUrlService,
  createMockUrlQueueProducer,
  mockLogger,
  restoreLogger,
} from 'src/libs/test-helpers';
import { UrlService, UrlQueueProducer } from 'src/url';
import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;

  const mockUrlService = createMockUrlService();
  const mockUrlQueueProducer = createMockUrlQueueProducer();

  const SHORT_CODE = 'abc123';
  const ORIGINAL_URL = 'https://example.com';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedirectService,
        {
          provide: UrlService,
          useValue: mockUrlService,
        },
        {
          provide: UrlQueueProducer,
          useValue: mockUrlQueueProducer,
        },
      ],
    }).compile();

    service = module.get(RedirectService);

    mockLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    restoreLogger();
  });

  describe('processRedirect', () => {
    it('should return original URL and queue analytics job when URL exists', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(ORIGINAL_URL);
      mockUrlQueueProducer.add.mockResolvedValue({} as any);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBe(ORIGINAL_URL);
      expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(SHORT_CODE);
      expect(mockUrlQueueProducer.add).toHaveBeenCalledWith('url:redirected', {
        shortCode: SHORT_CODE,
      });
    });

    it('should return null when URL does not exist', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(null);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBeNull();
      expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(SHORT_CODE);
      expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
    });

    it('should still return URL even when queuing analytics job fails', async () => {
      mockUrlService.findByShortCode.mockResolvedValue(ORIGINAL_URL);
      mockUrlQueueProducer.add.mockRejectedValue(new Error('Queue error'));

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toBe(ORIGINAL_URL);
      expect(mockUrlQueueProducer.add).toHaveBeenCalled();
    });

    it('should propagate URL service errors', async () => {
      const serviceError = new Error('URL service error');
      mockUrlService.findByShortCode.mockRejectedValue(serviceError);

      await expect(service.processRedirect(SHORT_CODE)).rejects.toThrow(
        serviceError,
      );
      expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
    });
  });
});
