import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateKeywordDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  intent?: string;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsNumber()
  difficulty?: number;
}
