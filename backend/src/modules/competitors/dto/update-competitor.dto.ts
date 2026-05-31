import { IsOptional, IsString } from 'class-validator';

export class UpdateCompetitorDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
