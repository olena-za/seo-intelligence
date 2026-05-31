import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAnalysisDto {
  @IsNotEmpty()
  @IsString()
  pageSnapshotId: string;

  @IsArray()
  topicalClusters: string[] = [];

  @IsOptional()
  @IsNumber()
  topicalDepth?: number;

  @IsArray()
  missingTopics: string[] = [];

  @IsNumber()
  expertiseScore: number = 0;

  @IsNumber()
  trustScore: number = 0;

  @IsOptional()
  @IsNumber()
  authorityScore?: number;

  @IsOptional()
  @IsString()
  primaryIntent?: string;

  @IsArray()
  secondaryIntents: string[] = [];

  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  originality?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsNumber()
  tokensCost: number = 0;
}
