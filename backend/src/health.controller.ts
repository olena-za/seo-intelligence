import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'seo-intelligence-api',
      uptime: process.uptime(),
    };
  }

  @Get('db')
  async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'seo-intelligence-api',
      database: 'ok',
      uptime: process.uptime(),
    };
  }
}
