export class UrlResponseDto {
  declare readonly shortCode: string;
  declare readonly shortUrl: string;
  declare readonly originalUrl: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly expiresAt: Date;

  constructor(data: UrlResponseDto) {
    Object.assign(this, data);
  }
}
