import { Injectable } from '@nestjs/common';
import { ResultQuality } from '@prisma/client';

export type ResultQualityInput = {
  url?: string | null;
  domain?: string | null;
  title?: string | null;
  markdown?: string | null;
  metadata?: Record<string, unknown> | null;
  wordCount?: number | null;
};

export type ResultQualityDecision = {
  quality: ResultQuality;
  processingSkipped: boolean;
  skipReason?: string;
  crawlStatus: string;
  crawlError?: string;
  protectionType?: string;
  blockedBy?: string;
  partialExtraction: boolean;
  extractionConfidence: number;
  renderQualityScore: number;
};

const UNSUPPORTED_HOSTS = [
  {
    pattern: /(^|\.)reddit\.com$/i,
    quality: ResultQuality.USER_GENERATED,
    reason: 'User-generated platform',
  },
  {
    pattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i,
    quality: ResultQuality.VIDEO,
    reason: 'Video result',
  },
  {
    pattern: /(^|\.)trustpilot\.com$/i,
    quality: ResultQuality.USER_GENERATED,
    reason: 'Review platform',
  },
  {
    pattern: /(^|\.)amazon\./i,
    quality: ResultQuality.MARKETPLACE,
    reason: 'Marketplace result',
  },
  {
    pattern: /(^|\.)ebay\./i,
    quality: ResultQuality.MARKETPLACE,
    reason: 'Marketplace result',
  },
  {
    pattern: /(^|\.)quora\.com$/i,
    quality: ResultQuality.FORUM,
    reason: 'Forum/Q&A platform',
  },
  {
    pattern: /(^|\.)medium\.com$/i,
    quality: ResultQuality.USER_GENERATED,
    reason: 'User-generated publishing platform',
  },
];

@Injectable()
export class ResultQualityService {
  classifyBeforeCrawl(input: ResultQualityInput): ResultQualityDecision {
    const url = input.url ?? '';
    const domain = input.domain ?? domainFromUrl(url) ?? '';

    if (/\.pdf(?:$|\?)/i.test(url)) {
      return skipped(ResultQuality.PDF, 'PDF result', 'unsupported_format');
    }

    const unsupported = UNSUPPORTED_HOSTS.find((item) =>
      item.pattern.test(domain),
    );
    if (unsupported) {
      return skipped(
        unsupported.quality,
        unsupported.reason,
        'unsupported_platform',
      );
    }

    return processable(70, 70);
  }

  classifyAfterCrawl(input: ResultQualityInput): ResultQualityDecision {
    const before = this.classifyBeforeCrawl(input);
    if (before.processingSkipped) return before;

    const markdown = input.markdown ?? '';
    const text = `${input.title ?? ''}\n${markdown}`.toLowerCase();
    const statusCode = Number(input.metadata?.statusCode);
    const wordCount = input.wordCount ?? wordCountOf(markdown);

    if (statusCode === 401 || statusCode === 403) {
      return skipped(
        ResultQuality.BLOCKED,
        `Crawler received status ${statusCode}`,
        'http_block',
        'origin',
        10,
        5,
      );
    }

    if (
      /captcha|recaptcha|hcaptcha|verify you are human|human verification/i.test(
        text,
      )
    ) {
      return skipped(
        ResultQuality.CAPTCHA,
        'CAPTCHA or human verification page detected',
        'captcha',
        'captcha',
        10,
        5,
      );
    }

    if (
      /cloudflare|attention required|checking your browser|cf-browser-verification/i.test(
        text,
      )
    ) {
      return skipped(
        ResultQuality.BLOCKED,
        'Cloudflare or browser challenge page detected',
        'challenge_page',
        'cloudflare',
        15,
        10,
      );
    }

    if (
      /access denied|forbidden|enable javascript|javascript is required/i.test(
        text,
      )
    ) {
      return skipped(
        ResultQuality.BLOCKED,
        'Access denied or JavaScript-required page detected',
        'access_denied',
        'origin',
        20,
        15,
      );
    }

    if (wordCount < 180 || markdown.length < 1200) {
      return {
        ...skipped(
          ResultQuality.LOW_CONTENT,
          'Insufficient crawlable content',
          'low_content',
          undefined,
          35,
          35,
        ),
        partialExtraction: wordCount > 40,
      };
    }

    const renderQualityScore = Math.min(
      100,
      Math.max(45, Math.round((wordCount / 1200) * 45 + markdown.length / 600)),
    );
    const extractionConfidence = Math.min(
      100,
      Math.max(50, renderQualityScore + (input.metadata?.description ? 10 : 0)),
    );

    return processable(extractionConfidence, renderQualityScore);
  }
}

function processable(
  extractionConfidence: number,
  renderQualityScore: number,
): ResultQualityDecision {
  return {
    quality: ResultQuality.PROCESSABLE,
    processingSkipped: false,
    crawlStatus: 'success',
    partialExtraction: false,
    extractionConfidence,
    renderQualityScore,
  };
}

function skipped(
  quality: ResultQuality,
  reason: string,
  protectionType?: string,
  blockedBy?: string,
  extractionConfidence = 0,
  renderQualityScore = 0,
): ResultQualityDecision {
  return {
    quality,
    processingSkipped: true,
    skipReason: reason,
    crawlStatus: 'skipped',
    crawlError: reason,
    protectionType,
    blockedBy,
    partialExtraction: false,
    extractionConfidence,
    renderQualityScore,
  };
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function wordCountOf(markdown: string) {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}
