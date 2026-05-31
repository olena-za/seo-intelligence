import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreatePageSnapshotDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  markdown?: string;

  @IsOptional()
  @IsString()
  cleanText?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  h1?: string[];

  @IsOptional()
  @IsArray()
  h2?: string[];

  @IsOptional()
  @IsArray()
  h3?: string[];
}
