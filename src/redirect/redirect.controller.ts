import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Res,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { UrlService } from 'src/url';
import type { Response } from 'express';

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
  async redirect(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !this.urlService.isValidShortCode(shortCode) ||
      this.urlService.isReservedShortCode(shortCode)
    ) {
      throw this.createShortCodeNotFoundException(shortCode);
    }

    const url = await this.redirectService.processRedirect(shortCode);
    if (!url) {
      throw this.createShortCodeNotFoundException(shortCode);
    }

    // Ensure every request need to pass through server-side redirect, preventing client-side caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(HttpStatus.TEMPORARY_REDIRECT, url);
  }
}
