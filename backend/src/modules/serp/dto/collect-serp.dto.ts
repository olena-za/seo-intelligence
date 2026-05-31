import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CollectSerpDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  keyword: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  locationCode?: number;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['desktop', 'mobile'])
  device?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  depth?: number;
}
