import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { createMockUrlService } from 'src/libs/test-helpers';
import { UrlModule, UrlService } from 'src/url';
import request from 'supertest';
import { createE2EModule } from './helpers';
import { UrlResponseDto } from 'src/url/dto';

const NOW = new Date('2025-11-18');
const EXPIRES_IN_24H = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
const EXPIRES_IN_48H = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);
const EXPIRES_IN_1_YEAR = new Date(NOW.getTime() + 8760 * 60 * 60 * 1000);

const DEFAULT_ORIGINAL_URL = 'https://example.com';
const DEFAULT_SHORT_CODE = 'abc123';
const BASE_URL = 'http://localhost:3000';

describe('URLs', () => {
  let app: INestApplication;
  const mockUrlService = createMockUrlService();

  const createMockResponse = (
    overrides?: Partial<UrlResponseDto>,
  ): UrlResponseDto =>
    new UrlResponseDto({
      shortCode: DEFAULT_SHORT_CODE,
      shortUrl: `${BASE_URL}/${DEFAULT_SHORT_CODE}`,
      originalUrl: DEFAULT_ORIGINAL_URL,
      expiresAt: EXPIRES_IN_24H,
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    });

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const { module } = await createE2EModule({
      imports: [UrlModule],
      providers: [{ provide: UrlService, useValue: mockUrlService }],
    });

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  describe('POST /urls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Success Cases', () => {
      it('should successfully create a short URL with default expiry', async () => {
        const mockResponse = createMockResponse();

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL })
          .expect(HttpStatus.CREATED);

        expect(response.body).toMatchObject({
          shortCode: DEFAULT_SHORT_CODE,
          shortUrl: expect.stringContaining(DEFAULT_SHORT_CODE),
          originalUrl: DEFAULT_ORIGINAL_URL,
          expiresAt: EXPIRES_IN_24H.toISOString(),
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        });
        expect(mockUrlService.createShortUrl).toHaveBeenCalledWith(
          DEFAULT_ORIGINAL_URL,
          undefined,
        );
      });

      it('should successfully create a short URL with custom expiry', async () => {
        const expiryInHours = 48;
        const shortCode = 'xyz789';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          expiresAt: EXPIRES_IN_48H,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL, expiryInHours })
          .expect(HttpStatus.CREATED);

        expect(response.body).toMatchObject({
          shortCode,
          shortUrl: expect.stringContaining(shortCode),
          originalUrl: DEFAULT_ORIGINAL_URL,
        });
        expect(mockUrlService.createShortUrl).toHaveBeenCalledWith(
          DEFAULT_ORIGINAL_URL,
          expiryInHours,
        );
      });

      it('should return all required fields in response', async () => {
        const originalUrl = 'https://test.com';
        const shortCode = 'test01';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body).toHaveProperty('shortCode');
        expect(response.body).toHaveProperty('shortUrl');
        expect(response.body).toHaveProperty('originalUrl');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('expiresAt');
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid URL format', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: 'not-a-valid-url' })
          .expect(HttpStatus.BAD_REQUEST);

        expect(mockUrlService.createShortUrl).not.toHaveBeenCalled();
      });

      it('should reject missing url field', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({ expiryInHours: 24 })
          .expect(HttpStatus.BAD_REQUEST);

        expect(mockUrlService.createShortUrl).not.toHaveBeenCalled();
      });

      it('should reject non-integer expiryInHours', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: 'https://example.com', expiryInHours: 24.5 })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject expiryInHours less than 1', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: 'https://example.com', expiryInHours: 0 })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject negative expiryInHours', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: 'https://example.com', expiryInHours: -1 })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject empty request body', async () => {
        await request(app.getHttpServer())
          .post('/urls')
          .send({})
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long URLs', async () => {
        const longPath = 'a'.repeat(2000);
        const originalUrl = `${DEFAULT_ORIGINAL_URL}/${longPath}`;
        const shortCode = 'long01';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body.originalUrl).toBe(originalUrl);
      });

      it('should handle URLs with query parameters', async () => {
        const originalUrl = 'https://example.com?foo=bar&baz=qux';
        const shortCode = 'query1';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body.originalUrl).toBe(originalUrl);
      });

      it('should handle URLs with hash fragments', async () => {
        const originalUrl = 'https://example.com/page#section';
        const shortCode = 'hash01';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body.originalUrl).toBe(originalUrl);
      });

      it('should handle international URLs', async () => {
        const originalUrl = 'https://例え.jp/テスト';
        const shortCode = 'intl01';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body.originalUrl).toBe(originalUrl);
      });

      it('should handle URLs with port numbers', async () => {
        const originalUrl = 'https://example.com:8080/path';
        const shortCode = 'port01';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          originalUrl,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ url: originalUrl })
          .expect(HttpStatus.CREATED);

        expect(response.body.originalUrl).toBe(originalUrl);
      });

      it('should handle maximum valid expiryInHours', async () => {
        const expiryInHours = 8760; // 1 year
        const shortCode = 'max001';
        const mockResponse = createMockResponse({
          shortCode,
          shortUrl: `${BASE_URL}/${shortCode}`,
          expiresAt: EXPIRES_IN_1_YEAR,
        });

        mockUrlService.createShortUrl.mockResolvedValue(mockResponse);

        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL, expiryInHours })
          .expect(HttpStatus.CREATED);
      });
    });

    describe('Service Errors', () => {
      it('should handle short code collision (P2002)', async () => {
        mockUrlService.createShortUrl.mockRejectedValue(
          new HttpException(
            'Short code already exists. Please try again',
            HttpStatus.CONFLICT,
          ),
        );

        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL })
          .expect(HttpStatus.CONFLICT);
      });

      it('should handle database connection errors', async () => {
        mockUrlService.createShortUrl.mockRejectedValue(
          new HttpException(
            'Failed to create short URL',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        );

        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL })
          .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it('should handle service unavailable when cannot generate unique code', async () => {
        mockUrlService.createShortUrl.mockRejectedValue(
          new HttpException(
            'Could not generate a unique short code now. Please try again',
            HttpStatus.SERVICE_UNAVAILABLE,
          ),
        );

        await request(app.getHttpServer())
          .post('/urls')
          .send({ url: DEFAULT_ORIGINAL_URL })
          .expect(HttpStatus.SERVICE_UNAVAILABLE);
      });
    });
  });
});
