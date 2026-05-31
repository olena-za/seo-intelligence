import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CollectSitemapDto {
  @IsUrl({ require_protocol: false })
  domain!: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
