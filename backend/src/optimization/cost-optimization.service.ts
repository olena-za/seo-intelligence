import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CostOptimizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getAiTokenCosts(projectId?: string) {
    const where = projectId ? { pageSnapshot: { projectId } } : undefined;

    const analyses = await this.prisma.aIAnalysis.findMany({
      where,
    });

    const totalTokens = analyses.reduce((sum, a) => sum + a.tokensCost, 0);
    const avgTokensPerAnalysis =
      analyses.length > 0 ? totalTokens / analyses.length : 0;

    // Assuming $0.0015 per 1K tokens (varies by model)
    const costPerThousandTokens = 0.0015;
    const totalCost = (totalTokens / 1000) * costPerThousandTokens;

    return {
      totalAnalyses: analyses.length,
      totalTokens,
      avgTokensPerAnalysis,
      estimatedCost: totalCost.toFixed(2),
      tokenDistribution: this.groupByDateRange(analyses),
    };
  }

  private groupByDateRange(analyses: any[]) {
    const byDay: Record<string, number> = {};

    for (const analysis of analyses) {
      const day = analysis.createdAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] ?? 0) + analysis.tokensCost;
    }

    return byDay;
  }
}
