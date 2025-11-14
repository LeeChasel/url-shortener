import { Body, Controller, Post } from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateUrlDto, UrlResponseDto } from './dto';

@Controller('urls')
export class UrlsController {
  constructor(private readonly urlService: UrlService) {}

  @Post()
  async createShortUrl(@Body() data: CreateUrlDto): Promise<UrlResponseDto> {
    const { url, expiryInHours } = data;

    return this.urlService.createShortUrl(url, expiryInHours);
  }
}
