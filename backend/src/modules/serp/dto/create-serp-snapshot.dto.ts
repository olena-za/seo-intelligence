import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SerpResultDto {
  @IsNumber()
  position: number;

  @IsString()
  url: string;

  @IsString()
  domain: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  sitelinks?: string[];
}

export class CreateSerpSnapshotDto {
  @IsString()
  projectId: string;

  @IsString()
  keywordId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SerpResultDto)
  results: SerpResultDto[];
}
