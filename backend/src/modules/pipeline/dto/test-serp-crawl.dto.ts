import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class TestSerpCrawlDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  keyword: string;
}
