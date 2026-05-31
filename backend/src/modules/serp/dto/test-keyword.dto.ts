import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class TestKeywordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  keyword: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  locationCode?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
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
