import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CreateUrlDto {
  @IsUrl()
  readonly url!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  readonly expiryInHours?: number;
}
