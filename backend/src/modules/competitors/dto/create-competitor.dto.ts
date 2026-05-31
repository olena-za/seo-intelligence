import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCompetitorDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  name?: string;
}
