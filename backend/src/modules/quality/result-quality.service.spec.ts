import { ResultQuality } from '@prisma/client';
import { ResultQualityService } from './result-quality.service';

describe('ResultQualityService', () => {
  const service = new ResultQualityService();

  it('skips unsupported user-generated SERP results before crawling', () => {
    const decision = service.classifyBeforeCrawl({
      url: 'https://www.reddit.com/r/seo/comments/abc',
      domain: 'reddit.com',
    });

    expect(decision.quality).toBe(ResultQuality.USER_GENERATED);
    expect(decision.processingSkipped).toBe(true);
  });

  it('detects Cloudflare challenge content after crawling', () => {
    const decision = service.classifyAfterCrawl({
      url: 'https://example.com',
      domain: 'example.com',
      markdown: 'Attention Required! Cloudflare verify you are human',
      wordCount: 8,
      metadata: { statusCode: 403 },
    });

    expect(decision.quality).toBe(ResultQuality.BLOCKED);
    expect(decision.blockedBy).toBe('origin');
    expect(decision.processingSkipped).toBe(true);
  });

  it('allows content-rich pages for deterministic extraction', () => {
    const decision = service.classifyAfterCrawl({
      url: 'https://example.com/best-crypto-casino',
      domain: 'example.com',
      markdown: Array.from({ length: 300 }, (_, index) => `word${index}`).join(
        ' ',
      ),
      wordCount: 300,
      metadata: { description: 'A real page' },
    });

    expect(decision.quality).toBe(ResultQuality.PROCESSABLE);
    expect(decision.processingSkipped).toBe(false);
    expect(decision.extractionConfidence).toBeGreaterThan(50);
  });
});
