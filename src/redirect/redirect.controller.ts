import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Res,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RedirectService } from './redirect.service';
import { UrlService } from 'src/url';
import type { Response } from 'express';
import { BotDetector } from './utils/bot-detector.util';

@ApiTags('redirect')
@Controller()
export class RedirectController {
  constructor(
    private readonly urlService: UrlService,
    private readonly redirectService: RedirectService,
  ) {}

  /** Helper method to create a consistent Not Found exception like default not found behavior */
  private createShortCodeNotFoundException(shortCode: string): HttpException {
    return new HttpException(
      {
        message: `Cannot GET /${shortCode}`,
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
  }

  @Get(':shortCode')
  @Version(VERSION_NEUTRAL) // Make this endpoint version-neutral
  @ApiOperation({ summary: 'Redirect to the original URL' })
  @ApiParam({
    name: 'shortCode',
    description: 'The short code of the URL',
    example: 'abc123',
  })
  @ApiResponse({
    status: 307,
    description: 'Temporary redirect to the original URL.',
  })
  @ApiResponse({
    status: 404,
    description: 'Short code not found or invalid.',
  })
  async redirect(
    @Param('shortCode') shortCode: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !this.urlService.isValidShortCode(shortCode) ||
      this.urlService.isReservedShortCode(shortCode)
    ) {
      throw this.createShortCodeNotFoundException(shortCode);
    }

    const urlWithMetadata =
      await this.redirectService.processRedirect(shortCode);
    if (!urlWithMetadata) {
      throw this.createShortCodeNotFoundException(shortCode);
    }

    if (BotDetector.isBot(userAgent)) {
      const { url, metadata } = urlWithMetadata;
      // Set cache headers to allow bot crawlers to cache the preview page
      res.setHeader('Cache-Control', 'public, max-age=3600');

      return res.render('og-preview', {
        url: url,
        title: metadata?.title || url,
        describe: metadata?.description || '',
        image: metadata?.image,
        siteName: metadata?.siteName,
        type: metadata?.type || 'website',
        locale: metadata?.locale,
      });
    }

    // Ensure every request need to pass through server-side redirect, preventing client-side caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(HttpStatus.TEMPORARY_REDIRECT, urlWithMetadata.url);
  }
}
