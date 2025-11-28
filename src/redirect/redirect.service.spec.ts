import { Test } from '@nestjs/testing';
import {
  createMockUrlService,
  createMockUrlQueueProducer,
  createMockMetadataService,
  createMockOpenGraphMetadata,
  mockLogger,
  restoreLogger,
} from 'src/libs/test-helpers';
import { UrlService, UrlQueueProducer } from 'src/url';
import { MetadataService } from 'src/metadata/metadata.service';
import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;

  const mockUrlService = createMockUrlService();
  const mockUrlQueueProducer = createMockUrlQueueProducer();
  const mockMetadataService = createMockMetadataService();

  const SHORT_CODE = 'abc123';
  const ORIGINAL_URL = 'https://example.com';
  const URL_ID = 1;

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
        {
          provide: MetadataService,
          useValue: mockMetadataService,
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
    it('should return original URL with metadata and queue analytics job when URL exists', async () => {
      const mockMetadata = createMockOpenGraphMetadata({
        image: 'https://example.com/image.png',
      });

      mockUrlService.findByShortCode.mockResolvedValue({
        id: URL_ID,
        url: ORIGINAL_URL,
      });
      mockUrlQueueProducer.add.mockResolvedValue({} as any);
      mockMetadataService.getMetadata.mockResolvedValue(mockMetadata);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toEqual({
        url: ORIGINAL_URL,
        metadata: mockMetadata,
      });
      expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(SHORT_CODE);
      expect(mockMetadataService.getMetadata).toHaveBeenCalledWith(URL_ID);
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

    it('should return URL with null metadata when metadata not available', async () => {
      mockUrlService.findByShortCode.mockResolvedValue({
        id: URL_ID,
        url: ORIGINAL_URL,
      });
      mockUrlQueueProducer.add.mockResolvedValue({} as any);
      mockMetadataService.getMetadata.mockResolvedValue(null);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toEqual({
        url: ORIGINAL_URL,
        metadata: null,
      });
      expect(mockMetadataService.getMetadata).toHaveBeenCalledWith(URL_ID);
    });

    it('should still return URL even when queuing analytics job fails', async () => {
      mockUrlService.findByShortCode.mockResolvedValue({
        id: URL_ID,
        url: ORIGINAL_URL,
      });
      mockUrlQueueProducer.add.mockRejectedValue(new Error('Queue error'));
      mockMetadataService.getMetadata.mockResolvedValue(null);

      const result = await service.processRedirect(SHORT_CODE);

      expect(result).toEqual({
        url: ORIGINAL_URL,
        metadata: null,
      });
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
