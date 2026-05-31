import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findSnapshots(pageId: string) {
    return this.prisma.pageSnapshot.findMany({
      where: { pageId },
      orderBy: { snapshotDate: 'desc' },
      include: { seoMetrics: true, aiAnalysis: true, entityMetrics: true },
    });
  }
}
