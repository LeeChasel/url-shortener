import { INestApplication } from '@nestjs/common';
import {
  createMockUrlQueueProducer,
  createMockUrlService,
  createMockMetadataQueueProducer,
  createMockMetadataService,
  type MockUrlQueueProducer,
  type MockUrlService,
  type MockMetadataQueueProducer,
  type MockMetadataService,
} from 'src/libs/test-helpers';
import { RedirectModule } from 'src/redirect';
import { UrlQueueProducer, UrlService } from 'src/url';
import { MetadataQueueProducer, MetadataService } from 'src/metadata';
import request from 'supertest';
import { createE2EModule } from './helpers';

describe('Redirect', () => {
  let app: INestApplication;
  let mockUrlService: MockUrlService;
  let mockUrlQueueProducer: MockUrlQueueProducer;
  let mockMetadataQueueProducer: MockMetadataQueueProducer;
  let mockMetadataService: MockMetadataService;

  beforeAll(async () => {
    mockUrlService = createMockUrlService();
    mockUrlQueueProducer = createMockUrlQueueProducer();
    mockMetadataQueueProducer = createMockMetadataQueueProducer();
    mockMetadataService = createMockMetadataService();

    // Setup default mock implementations
    mockUrlQueueProducer.add.mockResolvedValue({} as any);
    mockMetadataQueueProducer.add.mockResolvedValue({} as any);
    mockMetadataService.getMetadata.mockResolvedValue(null);

    const { module } = await createE2EModule({
      imports: [RedirectModule],
      providers: [
        { provide: UrlService, useValue: mockUrlService },
        {
          provide: UrlQueueProducer,
          useValue: mockUrlQueueProducer,
        },
        {
          provide: MetadataQueueProducer,
          useValue: mockMetadataQueueProducer,
        },
        {
          provide: MetadataService,
          useValue: mockMetadataService,
        },
      ],
    });

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /:shortCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Success Cases', () => {
      it('should redirect to the original URL with 307 status', async () => {
        const shortCode = 'abc123';
        const originalUrl = 'https://example.com';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 1,
          url: originalUrl,
        });

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        expect(response.headers.location).toBe(originalUrl);
        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlService.isReservedShortCode).toHaveBeenCalledWith(
          shortCode,
        );
        expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });

      it('should set no-cache headers to prevent caching', async () => {
        const shortCode = 'xyz789';
        const originalUrl = 'https://google.com';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 2,
          url: originalUrl,
        });

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        expect(response.headers['cache-control']).toBe(
          'no-cache, no-store, must-revalidate',
        );
        expect(response.headers['pragma']).toBe('no-cache');
        expect(response.headers['expires']).toBe('0');
        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });

      it('should handle short codes with allowed special characters', async () => {
        const shortCode = 'ab_-12';
        const originalUrl = 'https://test.com';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 3,
          url: originalUrl,
        });

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);

        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });
    });

    describe('Invalid Short Code Format', () => {
      it('should return 404 for short codes that are too short', async () => {
        const shortCode = 'abc';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlService.findByShortCode).not.toHaveBeenCalled();
        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for short codes that are too long', async () => {
        const shortCode = 'abc12345';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for short codes with invalid characters', async () => {
        const shortCode = 'abc@23';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for empty short code', async () => {
        const shortCode = '';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });
    });

    describe('Reserved Short Codes', () => {
      it('should return 404 for reserved short code "health"', async () => {
        const shortCode = 'health';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(true);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlService.isReservedShortCode).toHaveBeenCalledWith(
          shortCode,
        );
        expect(mockUrlService.findByShortCode).not.toHaveBeenCalled();
        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for reserved short code "HEALTH" (case insensitive)', async () => {
        const shortCode = 'HEALTH';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(true);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });
    });

    describe('Short Code Not Found', () => {
      it('should return 404 when short code does not exist in database', async () => {
        const shortCode = 'notfnd';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(null);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for expired URLs', async () => {
        const shortCode = 'expird';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(null);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });

      it('should return 404 for deleted URLs', async () => {
        const shortCode = 'deltd1';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(null);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlQueueProducer.add).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle URLs with query parameters', async () => {
        const shortCode = 'query1';
        const originalUrl = 'https://example.com?foo=bar&baz=qux';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 4,
          url: originalUrl,
        });

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);

        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });

      it('should handle URLs with hash fragments', async () => {
        const shortCode = 'hash01';
        const originalUrl = 'https://example.com/page#section';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 5,
          url: originalUrl,
        });

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);

        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });

      it('should handle very long original URLs', async () => {
        const shortCode = 'long01';
        const originalUrl = `https://example.com/${'a'.repeat(2000)}`;

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 6,
          url: originalUrl,
        });

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);

        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });

      it('should handle international URLs (URL encoded in headers)', async () => {
        const shortCode = 'intl01';
        const originalUrl = 'https://例え.jp/テスト';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue({
          id: 7,
          url: originalUrl,
        });

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        // HTTP headers automatically encode international characters
        expect(response.headers.location).toBe(encodeURI(originalUrl));
        expect(mockUrlQueueProducer.add).toHaveBeenCalledWith(
          'url:redirected',
          { shortCode },
        );
      });
    });
  });
});
