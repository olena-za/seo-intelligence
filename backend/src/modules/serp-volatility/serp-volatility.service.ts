import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SerpVolatilityService {
  private readonly logger = new Logger(SerpVolatilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateForSnapshot(keywordSnapshotId: string) {
    const snapshot = await this.prisma.keywordSnapshot.findUnique({
      where: { id: keywordSnapshotId },
      include: { competitorSnapshots: true },
    });

    if (!snapshot) return null;

    const previous = await this.prisma.keywordSnapshot.findFirst({
      where: {
        keyword: snapshot.keyword,
        id: { not: snapshot.id },
        capturedAt: { lt: snapshot.capturedAt },
      },
      orderBy: { capturedAt: 'desc' },
      include: { competitorSnapshots: true },
    });

    const currentDomains = snapshot.competitorSnapshots.map(
      (item) => item.domain,
    );
    const previousDomains =
      previous?.competitorSnapshots.map((item) => item.domain) ?? [];
    const newEntrants = currentDomains.filter(
      (domain) => !previousDomains.includes(domain),
    );
    const droppedDomains = previousDomains.filter(
      (domain) => !currentDomains.includes(domain),
    );

    const moves = snapshot.competitorSnapshots.map((current) => {
      const old = previous?.competitorSnapshots.find(
        (item) =>
          item.normalizedUrl === current.normalizedUrl ||
          item.domain === current.domain,
      );
      return old ? Math.abs(old.position - current.position) : 10;
    });

    const averageMove = moves.length
      ? moves.reduce((sum, item) => sum + item, 0) / moves.length
      : 0;
    const volatilityScore = Math.min(
      100,
      Math.round(
        averageMove * 8 + newEntrants.length * 8 + droppedDomains.length * 8,
      ),
    );
    const stableDomains = currentDomains.filter((domain) => {
      const old = previous?.competitorSnapshots.find(
        (item) => item.domain === domain,
      );
      const current = snapshot.competitorSnapshots.find(
        (item) => item.domain === domain,
      );
      return old && current && Math.abs(old.position - current.position) <= 1;
    });

    const record = await this.prisma.serpVolatilitySnapshot.upsert({
      where: { keywordSnapshotId },
      create: {
        keywordSnapshotId,
        keyword: snapshot.keyword,
        volatilityScore,
        averageMove,
        newEntrants,
        droppedDomains,
        stableDomains,
        rankingMomentum: snapshot.competitorSnapshots.map((current) => ({
          domain: current.domain,
          position: current.position,
          previousPosition:
            previous?.competitorSnapshots.find(
              (item) => item.domain === current.domain,
            )?.position ?? null,
        })),
        turbulenceMetrics: {
          currentCount: currentDomains.length,
          previousCount: previousDomains.length,
        },
      },
      update: {
        volatilityScore,
        averageMove,
        newEntrants,
        droppedDomains,
        stableDomains,
      },
    });

    this.logger.log(
      `[Volatility] keyword="${snapshot.keyword}" score=${volatilityScore}`,
    );
    return record;
  }
}
