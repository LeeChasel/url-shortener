import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.google.com',
  })
  @IsUrl()
  declare readonly url: string;

  @ApiPropertyOptional({
    description: 'Expiry time in hours for the short URL',
    example: 24,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  declare readonly expiryInHours?: number;
}
