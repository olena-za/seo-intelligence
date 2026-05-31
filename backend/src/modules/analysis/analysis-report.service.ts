import { Injectable, Logger } from '@nestjs/common';
import { SerpService, TestPipelineResult } from '../serp/serp.service';

export type SeoIntelligenceReport = {
  keyword: string;
  summary: {
    topUrl: string;
    title: string;
    wordCount: number;
    crawlDurationMs: number;
  };
  intent: {
    primaryIntent: string;
    secondaryIntents: string[];
  };
  entities: string[];
  contentStructure: {
    faqDetected: boolean;
    tablesDetected: boolean;
    reviewContent: boolean;
    headingsCount: number;
  };
  semanticCoverage: {
    coveredTopics: string[];
    missingTopics: string[];
    depth: string;
  };
  qualitySignals: {
    authorPresent: boolean;
    schemaPresent: boolean;
    eeatLevel: string;
  };
  recommendations: string[];
  pipeline: {
    status: 'success';
    durationMs: number;
  };
};

@Injectable()
export class AnalysisReportService {
  private readonly logger = new Logger(AnalysisReportService.name);

  constructor(private readonly serpService: SerpService) {}

  async generateTestReport(keyword: string): Promise<SeoIntelligenceReport> {
    const startedAt = Date.now();
    this.logger.log(`[Report] Starting test report keyword="${keyword}"`);

    const pipeline = await this.serpService.runTestPipeline({ keyword });
    const report = this.toReport(pipeline);

    this.logger.debug(
      `[Report] Raw OpenAI analysis preserved internally: ${safeJson(pipeline.analysis.result, 3000)}`,
    );
    this.logger.log(
      `[Report] Report generated keyword="${keyword}" durationMs=${Date.now() - startedAt}`,
    );

    return report;
  }

  private toReport(pipeline: TestPipelineResult): SeoIntelligenceReport {
    const analysis = pipeline.analysis.result;
    const markdown = pipeline.crawledPage.markdown ?? '';

    const coveredTopics = uniqueStrings([
      ...analysis.entities,
      analysis.primaryIntent,
      ...inferCoveredTopics(markdown),
    ]).slice(0, 14);

    const recommendations = uniqueStrings([
      ...analysis.optimizationOpportunities,
      ...analysis.contentGaps.map((gap) => `Address content gap: ${gap}`),
    ]).slice(0, 12);

    return {
      keyword: pipeline.keyword,
      summary: {
        topUrl: pipeline.crawledUrl,
        title: pipeline.crawledPage.title,
        wordCount: pipeline.crawledPage.wordCount,
        crawlDurationMs: pipeline.crawlDurationMs,
      },
      intent: {
        primaryIntent: stringValue(analysis.primaryIntent, 'unknown'),
        secondaryIntents: inferSecondaryIntents(
          markdown,
          analysis.primaryIntent,
        ),
      },
      entities: uniqueStrings(analysis.entities).slice(0, 24),
      contentStructure: {
        faqDetected:
          /\b(faq|frequently asked questions|people also ask)\b/i.test(
            markdown,
          ),
        tablesDetected: detectMarkdownTable(markdown),
        reviewContent:
          /\b(review|reviews|rated|rating|best|top\s+\d+|ranked|pros|cons)\b/i.test(
            markdown,
          ),
        headingsCount: countMarkdownHeadings(markdown),
      },
      semanticCoverage: {
        coveredTopics,
        missingTopics: uniqueStrings(analysis.contentGaps).slice(0, 12),
        depth: depthLabel(analysis.scores.topicalDepth),
      },
      qualitySignals: {
        authorPresent:
          /\b(author|written by|reviewed by|editor|expert)\b/i.test(markdown),
        schemaPresent:
          analysis.schemaIssues.length === 0
            ? false
            : !analysis.schemaIssues.some((issue) =>
                /no|missing|absen/i.test(issue),
              ),
        eeatLevel: eeatLabel(analysis.scores.eeatSignals),
      },
      recommendations,
      pipeline: {
        status: 'success',
        durationMs: pipeline.totalDurationMs,
      },
    };
  }
}

function inferSecondaryIntents(
  markdown: string,
  primaryIntent: string,
): string[] {
  const intents = new Set<string>();
  const text = markdown.toLowerCase();

  if (/\b(best|top|compare|comparison|vs\.?|ranked)\b/.test(text))
    intents.add('commercial');
  if (/\b(how to|guide|what is|faq|learn)\b/.test(text))
    intents.add('informational');
  if (/\b(bonus|deposit|withdraw|play now|sign up|pricing)\b/.test(text))
    intents.add('transactional');
  if (/\b(brand|login|official|review)\b/.test(text))
    intents.add('navigational');

  intents.delete(primaryIntent.toLowerCase());
  return [...intents].slice(0, 3);
}

function inferCoveredTopics(markdown: string): string[] {
  const topics = [
    'bonuses',
    'withdrawals',
    'payments',
    'security',
    'KYC',
    'game selection',
    'licensing',
    'mobile experience',
    'sports betting',
    'user reviews',
    'fees',
    'support',
  ];
  const text = markdown.toLowerCase();

  return topics.filter((topic) => text.includes(topic.toLowerCase()));
}

function countMarkdownHeadings(markdown: string): number {
  return markdown.split('\n').filter((line) => /^#{1,6}\s+\S/.test(line.trim()))
    .length;
}

function detectMarkdownTable(markdown: string): boolean {
  const lines = markdown.split('\n');
  return lines.some(
    (line, index) =>
      line.includes('|') &&
      /^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1] ?? ''),
  );
}

function depthLabel(score: number): string {
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'thin';
}

function eeatLabel(score: number): string {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stringValue(
  value: string | null | undefined,
  fallback: string,
): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeJson(value: unknown, maxLength: number) {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return '[unserializable]';
  }
}
