import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CreateUrlDto {
  @IsUrl()
  declare readonly url: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  declare readonly expiryInHours?: number;
}
