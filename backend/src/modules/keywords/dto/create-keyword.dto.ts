import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateKeywordDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  keyword: string;

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
