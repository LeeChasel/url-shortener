import { INestApplication } from '@nestjs/common';
import { createMockUrlService } from 'src/libs/test-helpers';
import { RedirectModule } from 'src/redirect';
import { UrlService } from 'src/url';
import request from 'supertest';
import { createE2EModule } from './helpers';

describe('Redirect', () => {
  let app: INestApplication;
  const mockUrlService = createMockUrlService();

  beforeAll(async () => {
    const { module } = await createE2EModule({
      imports: [RedirectModule],
      providers: [{ provide: UrlService, useValue: mockUrlService }],
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
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        expect(response.headers.location).toBe(originalUrl);
        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlService.isReservedShortCode).toHaveBeenCalledWith(
          shortCode,
        );
        expect(mockUrlService.findByShortCode).toHaveBeenCalledWith(shortCode);
      });

      it('should set no-cache headers to prevent caching', async () => {
        const shortCode = 'xyz789';
        const originalUrl = 'https://google.com';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        expect(response.headers['cache-control']).toBe(
          'no-cache, no-store, must-revalidate',
        );
        expect(response.headers['pragma']).toBe('no-cache');
        expect(response.headers['expires']).toBe('0');
      });

      it('should handle short codes with allowed special characters', async () => {
        const shortCode = 'ab_-12';
        const originalUrl = 'https://test.com';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);
      });
    });

    describe('Invalid Short Code Format', () => {
      it('should return 404 for short codes that are too short', async () => {
        const shortCode = 'abc';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
        expect(mockUrlService.findByShortCode).not.toHaveBeenCalled();
      });

      it('should return 404 for short codes that are too long', async () => {
        const shortCode = 'abc12345';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);

        expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(shortCode);
      });

      it('should return 404 for short codes with invalid characters', async () => {
        const shortCode = 'abc@23';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
      });

      it('should return 404 for empty short code', async () => {
        const shortCode = '';
        mockUrlService.isValidShortCode.mockReturnValue(false);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
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
      });

      it('should return 404 for reserved short code "HEALTH" (case insensitive)', async () => {
        const shortCode = 'HEALTH';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(true);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
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
      });

      it('should return 404 for expired URLs', async () => {
        const shortCode = 'expird';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(null);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
      });

      it('should return 404 for deleted URLs', async () => {
        const shortCode = 'deltd1';
        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(null);

        await request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
      });
    });

    describe('Edge Cases', () => {
      it('should handle URLs with query parameters', async () => {
        const shortCode = 'query1';
        const originalUrl = 'https://example.com?foo=bar&baz=qux';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);
      });

      it('should handle URLs with hash fragments', async () => {
        const shortCode = 'hash01';
        const originalUrl = 'https://example.com/page#section';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);
      });

      it('should handle very long original URLs', async () => {
        const shortCode = 'long01';
        const originalUrl = `https://example.com/${'a'.repeat(2000)}`;

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307)
          .expect('Location', originalUrl);
      });

      it('should handle international URLs (URL encoded in headers)', async () => {
        const shortCode = 'intl01';
        const originalUrl = 'https://例え.jp/テスト';

        mockUrlService.isValidShortCode.mockReturnValue(true);
        mockUrlService.isReservedShortCode.mockReturnValue(false);
        mockUrlService.findByShortCode.mockResolvedValue(originalUrl);

        const response = await request(app.getHttpServer())
          .get(`/${shortCode}`)
          .expect(307);

        // HTTP headers automatically encode international characters
        expect(response.headers.location).toBe(encodeURI(originalUrl));
      });
    });
  });
});
