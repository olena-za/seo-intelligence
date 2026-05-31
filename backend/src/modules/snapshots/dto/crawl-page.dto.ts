import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CrawlPageDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  url: string;
}
