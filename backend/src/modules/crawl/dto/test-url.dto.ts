import { IsNotEmpty, IsUrl } from 'class-validator';

export class TestUrlDto {
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;
}
