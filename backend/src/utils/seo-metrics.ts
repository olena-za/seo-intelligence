export interface SeoMetricsPayload {
  cleanText: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  internalLinks: string[];
  externalLinks: string[];
  anchorTexts: string[];
}

export function calculateSeoMetrics(payload: SeoMetricsPayload) {
  const words = payload.cleanText.split(/\s+/).filter(Boolean);
  const sentences = payload.cleanText
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0);
  const paragraphs = payload.cleanText
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim().length > 0);
  const avgSentenceLength = sentences.length
    ? words.length / sentences.length
    : 0;
  const headingKeywords = [
    ...payload.headings.h1,
    ...payload.headings.h2,
    ...payload.headings.h3,
  ]
    .flatMap((heading) => heading.split(/\s+/))
    .map((token) => token.toLowerCase())
    .filter(Boolean);

  const headingFrequency = headingKeywords.reduce<Record<string, number>>(
    (acc, keyword) => {
      acc[keyword] = (acc[keyword] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    avgSentenceLength,
    readingScore:
      206.835 -
      1.015 * avgSentenceLength -
      84.6 * (words.length / Math.max(paragraphs.length, 1)),
    h1Count: payload.headings.h1.length,
    h2Count: payload.headings.h2.length,
    h3Count: payload.headings.h3.length,
    headingKeywords,
    headingFrequency,
    totalSections: payload.headings.h2.length + payload.headings.h3.length,
    avgSectionLength: payload.headings.h2.length
      ? words.length / payload.headings.h2.length
      : words.length,
    sectionTitles: payload.headings.h2,
    faqSectionExists: payload.cleanText.toLowerCase().includes('faq'),
    comparisonTableExists:
      payload.cleanText.toLowerCase().includes('compare') ||
      payload.cleanText.toLowerCase().includes('vs'),
    prosConsExists: /pros\s*and\s*cons/i.test(payload.cleanText),
    reviewBlocksExists: /review/i.test(payload.cleanText),
    internalLinkCount: payload.internalLinks.length,
    externalLinkCount: payload.externalLinks.length,
    anchorTextFrequency: payload.anchorTexts.reduce<Record<string, number>>(
      (acc, anchor) => {
        acc[anchor] = (acc[anchor] ?? 0) + 1;
        return acc;
      },
      {},
    ),
  };
}
