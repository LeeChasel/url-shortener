import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';
import { UrlService } from 'src/url';
import {
  createMockRedirectService,
  createMockResponse,
  createMockUrlService,
  MockResponse,
} from 'src/libs/test-helpers';

describe('RedirectController', () => {
  let controller: RedirectController;

  const mockUrlService = createMockUrlService();
  const mockRedirectService = createMockRedirectService();
  let mockResponse: MockResponse;

  const VALID_SHORT_CODE = 'abc123';
  const INVALID_SHORT_CODE = 'abc';
  const RESERVED_SHORT_CODE = 'health';
  const ORIGINAL_URL = 'https://example.com';
  const CACHE_HEADERS_COUNT = 3;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [
        {
          provide: UrlService,
          useValue: mockUrlService,
        },
        {
          provide: RedirectService,
          useValue: mockRedirectService,
        },
      ],
    }).compile();

    controller = module.get(RedirectController);
    mockResponse = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('redirect', () => {
    beforeEach(() => {
      mockUrlService.isValidShortCode.mockReturnValue(true);
      mockUrlService.isReservedShortCode.mockReturnValue(false);
      mockRedirectService.processRedirect.mockResolvedValue(ORIGINAL_URL);
    });

    it('should redirect to the original URL for a valid short code', async () => {
      await controller.redirect(VALID_SHORT_CODE, mockResponse);

      expect(mockUrlService.isValidShortCode).toHaveBeenCalledWith(
        VALID_SHORT_CODE,
      );
      expect(mockUrlService.isReservedShortCode).toHaveBeenCalledWith(
        VALID_SHORT_CODE,
      );
      expect(mockRedirectService.processRedirect).toHaveBeenCalledWith(
        VALID_SHORT_CODE,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledTimes(CACHE_HEADERS_COUNT);
      expect(mockResponse.setHeader).toHaveBeenNthCalledWith(
        1,
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      );
      expect(mockResponse.setHeader).toHaveBeenNthCalledWith(
        2,
        'Pragma',
        'no-cache',
      );
      expect(mockResponse.setHeader).toHaveBeenNthCalledWith(3, 'Expires', '0');

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        HttpStatus.TEMPORARY_REDIRECT,
        ORIGINAL_URL,
      );
    });

    it('should throw NOT_FOUND exception for invalid short code', async () => {
      mockUrlService.isValidShortCode.mockReturnValue(false);

      await expect(
        controller.redirect(INVALID_SHORT_CODE, mockResponse),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          message: `Cannot GET /${INVALID_SHORT_CODE}`,
          error: 'Not Found',
          statusCode: HttpStatus.NOT_FOUND,
        },
      });

      expect(mockRedirectService.processRedirect).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND exception for reserved short code', async () => {
      mockUrlService.isReservedShortCode.mockReturnValue(true);

      await expect(
        controller.redirect(RESERVED_SHORT_CODE, mockResponse),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          message: `Cannot GET /${RESERVED_SHORT_CODE}`,
          error: 'Not Found',
          statusCode: HttpStatus.NOT_FOUND,
        },
      });

      expect(mockRedirectService.processRedirect).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND exception when URL is not found', async () => {
      mockRedirectService.processRedirect.mockResolvedValue(null);

      await expect(
        controller.redirect(VALID_SHORT_CODE, mockResponse),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          message: `Cannot GET /${VALID_SHORT_CODE}`,
          error: 'Not Found',
          statusCode: HttpStatus.NOT_FOUND,
        },
      });

      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      mockRedirectService.processRedirect.mockRejectedValue(error);

      await expect(
        controller.redirect(VALID_SHORT_CODE, mockResponse),
      ).rejects.toThrow(error);
    });
  });
});
