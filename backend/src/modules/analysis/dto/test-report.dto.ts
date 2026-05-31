import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class TestReportDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(160)
  keyword!: string;
}
