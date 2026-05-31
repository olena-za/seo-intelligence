import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeTextDto {
  @IsNotEmpty()
  @IsString()
  text: string;
}
