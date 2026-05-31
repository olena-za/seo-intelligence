import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Ensure DATABASE_URL is loaded from environment
    const databaseUrl = process.env.DATABASE_URL || '';
    if (!databaseUrl) {
      console.warn(
        'DATABASE_URL not set, PrismaClient will attempt to read from schema',
      );
    }
    super();

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = this;
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
