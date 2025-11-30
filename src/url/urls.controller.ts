import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UrlService } from './url.service';
import { CreateUrlDto, UrlResponseDto } from './dto';

@ApiTags('urls')
@Controller('urls')
export class UrlsController {
  constructor(private readonly urlService: UrlService) {}

  @Post()
  @ApiOperation({ summary: 'Create a short URL' })
  @ApiBody({ type: CreateUrlDto })
  @ApiResponse({
    status: 201,
    description: 'The short URL has been successfully created.',
    type: UrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid URL or expiry time.',
  })
  async createShortUrl(@Body() data: CreateUrlDto): Promise<UrlResponseDto> {
    const { url, expiryInHours } = data;

    return this.urlService.createShortUrl(url, expiryInHours);
  }
}
