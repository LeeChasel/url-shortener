import { ApiProperty } from '@nestjs/swagger';

export class UrlResponseDto {
  @ApiProperty({
    description: 'Unique short code for the URL',
    example: 'abc123',
  })
  declare readonly shortCode: string;

  @ApiProperty({
    description: 'Full short URL',
    example: 'http://localhost:3000/abc123',
  })
  declare readonly shortUrl: string;

  @ApiProperty({
    description: 'Original long URL',
    example: 'https://www.google.com',
  })
  declare readonly originalUrl: string;

  @ApiProperty({
    description: 'Timestamp when the short URL was created',
    example: '2025-11-30T10:00:00.000Z',
  })
  declare readonly createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the short URL was last updated',
    example: '2025-11-30T10:00:00.000Z',
  })
  declare readonly updatedAt: Date;

  @ApiProperty({
    description: 'Timestamp when the short URL will expire',
    example: '2025-12-01T10:00:00.000Z',
  })
  declare readonly expiresAt: Date;

  constructor(data: UrlResponseDto) {
    Object.assign(this, data);
  }
}
