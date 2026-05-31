import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SnapshotDiffChangeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type FeatureLike = {
  title?: string | null;
  metaDescription?: string | null;
  h1Count?: number;
  h2Count?: number;
  h3Count?: number;
  wordCount?: number;
  faqCount?: number;
  tableCount?: number;
  ctaCount?: number;
  trustSignals?: string[];
  bonusStructures?: string[];
  freshnessSignals?: string[];
  internalLinksCount?: number;
  anchorTexts?: string[];
  textKeywordPhrases?: string[];
  seoKeywordPhrases?: string[];
  primaryEntities?: string[];
};

const DIFF_FIELDS: Array<{
  field: keyof FeatureLike;
  category: string;
  type: 'number' | 'array' | 'string';
}> = [
  { field: 'title', category: 'seo', type: 'string' },
  { field: 'metaDescription', category: 'seo', type: 'string' },
  { field: 'h1Count', category: 'seo', type: 'number' },
  { field: 'h2Count', category: 'seo', type: 'number' },
  { field: 'h3Count', category: 'seo', type: 'number' },
  { field: 'faqCount', category: 'structure', type: 'number' },
  { field: 'tableCount', category: 'structure', type: 'number' },
  { field: 'wordCount', category: 'content', type: 'number' },
  { field: 'ctaCount', category: 'cro', type: 'number' },
  { field: 'trustSignals', category: 'trust', type: 'array' },
  { field: 'bonusStructures', category: 'freshness', type: 'array' },
  { field: 'freshnessSignals', category: 'freshness', type: 'array' },
  { field: 'internalLinksCount', category: 'internal_linking', type: 'number' },
  { field: 'anchorTexts', category: 'internal_linking', type: 'array' },
  { field: 'textKeywordPhrases', category: 'semantic', type: 'array' },
  { field: 'seoKeywordPhrases', category: 'semantic', type: 'array' },
  { field: 'primaryEntities', category: 'entities', type: 'array' },
];

@Injectable()
export class SnapshotDiffService {
  private readonly logger = new Logger(SnapshotDiffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDiffs(
    currentCompetitorSnapshotId: string,
    previousCompetitorSnapshotId?: string | null,
  ) {
    if (!previousCompetitorSnapshotId) {
      this.logger.log(
        `[Diff] No previous snapshot for current=${currentCompetitorSnapshotId}`,
      );
      return [];
    }

    const [current, previous] = await Promise.all([
      this.prisma.extractedFeatures.findUnique({
        where: { competitorSnapshotId: currentCompetitorSnapshotId },
      }),
      this.prisma.extractedFeatures.findUnique({
        where: { competitorSnapshotId: previousCompetitorSnapshotId },
      }),
    ]);

    if (!current || !previous) {
      this.logger.warn(
        `[Diff] Missing features current=${Boolean(current)} previous=${Boolean(previous)}`,
      );
      return [];
    }

    const rows = DIFF_FIELDS.map((field) => buildDiff(current, previous, field))
      .filter((row) => row.changeType !== SnapshotDiffChangeType.UNCHANGED)
      .map((row) => ({
        ...row,
        currentCompetitorSnapshotId,
        previousCompetitorSnapshotId,
      }));

    if (!rows.length) return [];

    await this.prisma.snapshotDiff.createMany({
      data: rows.map((row) => ({
        ...row,
        previousValue: row.previousValue as Prisma.InputJsonValue,
        currentValue: row.currentValue as Prisma.InputJsonValue,
        delta: row.delta as Prisma.InputJsonValue,
      })),
    });

    this.logger.log(
      `[Diff] Stored ${rows.length} diffs current=${currentCompetitorSnapshotId}`,
    );
    return rows;
  }
}

function buildDiff(
  current: FeatureLike,
  previous: FeatureLike,
  definition: (typeof DIFF_FIELDS)[number],
) {
  const previousValue = previous[definition.field];
  const currentValue = current[definition.field];

  if (definition.type === 'number') {
    const previousNumber = Number(previousValue ?? 0);
    const currentNumber = Number(currentValue ?? 0);
    const delta = currentNumber - previousNumber;
    return {
      field: definition.field,
      category: definition.category,
      changeType:
        delta === 0
          ? SnapshotDiffChangeType.UNCHANGED
          : SnapshotDiffChangeType.CHANGED,
      previousValue: previousNumber,
      currentValue: currentNumber,
      delta: { value: delta },
      severity: Math.min(100, Math.abs(delta)),
    };
  }

  if (definition.type === 'array') {
    const previousItems = arrayValue(previousValue);
    const currentItems = arrayValue(currentValue);
    const added = currentItems.filter((item) => !previousItems.includes(item));
    const removed = previousItems.filter(
      (item) => !currentItems.includes(item),
    );
    const changed = added.length > 0 || removed.length > 0;
    return {
      field: definition.field,
      category: definition.category,
      changeType: changed
        ? SnapshotDiffChangeType.CHANGED
        : SnapshotDiffChangeType.UNCHANGED,
      previousValue: previousItems,
      currentValue: currentItems,
      delta: { added, removed },
      severity: Math.min(100, (added.length + removed.length) * 10),
    };
  }

  const changed = String(previousValue ?? '') !== String(currentValue ?? '');
  return {
    field: definition.field,
    category: definition.category,
    changeType: changed
      ? SnapshotDiffChangeType.CHANGED
      : SnapshotDiffChangeType.UNCHANGED,
    previousValue: previousValue ?? null,
    currentValue: currentValue ?? null,
    delta: { changed },
    severity: changed ? 35 : 0,
  };
}

function arrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
