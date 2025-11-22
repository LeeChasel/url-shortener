import { Test } from '@nestjs/testing';
import { UrlsController } from './urls.controller';
import { UrlService } from './url.service';
import { CreateUrlDto, UrlResponseDto } from './dto';
import { createMockUrlService } from 'src/libs/test-helpers';

describe('UrlsController', () => {
  let controller: UrlsController;

  const mockUrlService = createMockUrlService();

  const mockResponse: UrlResponseDto = {
    shortCode: 'abc123',
    shortUrl: 'http://localhost:3000/abc123',
    originalUrl: 'https://example.com',
    createdAt: new Date('2025-11-18'),
    updatedAt: new Date('2025-11-18'),
    expiresAt: new Date('2025-11-19'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UrlsController],
      providers: [
        {
          provide: UrlService,
          useValue: mockUrlService,
        },
      ],
    }).compile();

    controller = module.get(UrlsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createShortUrl', () => {
    it('should create a short URL with default expiry', async () => {
      const createUrlDto: CreateUrlDto = {
        url: 'https://example.com',
      };
      mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

      const result = await controller.createShortUrl(createUrlDto);

      expect(result).toEqual(mockResponse);
      expect(mockUrlService.createShortUrl).toHaveBeenCalledWith(
        'https://example.com',
        undefined,
      );
    });

    it('should create a short URL with custom expiry', async () => {
      const createUrlDto: CreateUrlDto = {
        url: 'https://example.com',
        expiryInHours: 48,
      };
      mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

      const result = await controller.createShortUrl(createUrlDto);

      expect(result).toEqual(mockResponse);
      expect(mockUrlService.createShortUrl).toHaveBeenCalledWith(
        'https://example.com',
        48,
      );
    });

    it('should propagate service errors', async () => {
      const createUrlDto: CreateUrlDto = {
        url: 'https://example.com',
      };

      const error = new Error('Service error');
      mockUrlService.createShortUrl.mockRejectedValue(error);

      await expect(controller.createShortUrl(createUrlDto)).rejects.toThrow(
        error,
      );
    });
  });
});
