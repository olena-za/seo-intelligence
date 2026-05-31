import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeKeywordDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  keyword: string;
}
