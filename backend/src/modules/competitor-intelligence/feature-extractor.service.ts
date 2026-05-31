import { Injectable } from '@nestjs/common';

export type ExtractedCompetitorFeatures = {
  title?: string;
  metaDescription?: string;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  faqCount: number;
  tableCount: number;
  schemaPresent: boolean;
  extractionQuality: ExtractionQuality;
  primaryEntities: string[];
  recurringMoneyKeywords: string[];
  moneyKeywords: string[];
  semanticClusters: Record<string, string[]>;
  keywordUsageFrequency: Record<string, number>;
  textKeywordPhrases: string[];
  seoKeywordPhrases: string[];
  keywordPhraseFrequency: Record<string, number>;
  seoKeywordPhraseFrequency: Record<string, number>;
  ctaCount: number;
  ctaWording: string[];
  urgencyWording: string[];
  bonusStructures: string[];
  percentages: string[];
  currencies: string[];
  kycMentions: boolean;
  licenses: string[];
  provablyFair: boolean;
  wallets: string[];
  reviewSchema: boolean;
  trustSignals: string[];
  internalLinksCount: number;
  anchorTexts: string[];
  hubPageReferences: string[];
  updatedYearMentions: string[];
  latestBonuses: string[];
  recentReleases: string[];
  freshnessSignals: string[];
  hreflang: string[];
  localizedCurrencies: string[];
  countryTargeting: string[];
};

export type ExtractionQuality =
  | 'blocked_by_cloudflare'
  | 'insufficient_content'
  | 'js_render_failed'
  | 'extraction_success';

@Injectable()
export class FeatureExtractorService {
  extract(input: {
    keyword: string;
    url: string;
    domain: string;
    title?: string | null;
    markdown: string;
    metadata?: Record<string, unknown>;
    wordCount: number;
  }): ExtractedCompetitorFeatures {
    const normalizedPageUrl = normalizeUrlForComparison(input.url);
    const markdown = input.markdown ?? '';
    const text = normalizeText(markdown);
    const lower = text.toLowerCase();
    const links = extractMarkdownLinks(markdown);
    const internalLinks = links.filter((link) =>
      isInternalLink(input.domain, link.url),
    );
    const contentInternalHtmlLinks = internalLinks
      .filter((link) => !link.isImageLink)
      .filter((link) => link.anchor.length > 0)
      .map((link) => ({ ...link, url: stripEncodedMarkdownTitle(link.url) }))
      .filter((link) => isLikelyHtmlPageUrl(link.url))
      .filter((link) => normalizeUrlForComparison(link.url) !== normalizedPageUrl);
    const headings = extractHeadings(markdown);
    const seoText = [
      input.title,
      input.metadata?.title,
      input.metadata?.description,
      ...headings.h1,
      ...headings.h2,
      ...headings.h3,
    ]
      .filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
      .join(' ');
    const phraseCandidates = keywordPhraseCandidates(
      input.keyword,
      text,
      seoText,
    );
    const keywordPhraseFrequency = keywordFrequency(lower, phraseCandidates);
    const seoKeywordPhraseFrequency = keywordFrequency(
      seoText.toLowerCase(),
      phraseCandidates,
    );

    return {
      title: input.title ?? stringValue(input.metadata?.title),
      metaDescription: stringValue(input.metadata?.description),
      h1Count: headings.h1.length,
      h2Count: headings.h2.length,
      h3Count: headings.h3.length,
      wordCount: input.wordCount,
      faqCount: countMatches(
        lower,
        /\b(faq|frequently asked questions|people also ask)\b/g,
      ),
      tableCount: countMarkdownTables(markdown),
      schemaPresent: hasSchema(input.metadata),
      extractionQuality: extractionQuality(
        input.metadata,
        text,
        input.wordCount,
      ),
      primaryEntities: extractEntities(text),
      recurringMoneyKeywords: recurringMatches(lower, MONEY_KEYWORDS),
      moneyKeywords: recurringMatches(lower, MONEY_KEYWORDS),
      semanticClusters: semanticClusters(lower),
      keywordUsageFrequency: keywordFrequency(lower, [
        input.keyword,
        ...MONEY_KEYWORDS,
      ]),
      textKeywordPhrases: Object.keys(keywordPhraseFrequency),
      seoKeywordPhrases: Object.keys(seoKeywordPhraseFrequency),
      keywordPhraseFrequency,
      seoKeywordPhraseFrequency,
      ctaCount: countCtas(lower),
      ctaWording: extractCtaWording(markdown),
      urgencyWording: recurringMatches(lower, URGENCY_TERMS),
      bonusStructures: unique(
        matchAll(text, /\b(?:welcome\s+)?bonus(?:es)?\b[^.\n]{0,90}/gi),
      ).slice(0, 12),
      percentages: unique(matchAll(text, /\b\d{1,4}(?:\.\d+)?\s?%/g)).slice(
        0,
        20,
      ),
      currencies: unique(
        matchAll(
          text,
          /(?:[$€£]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:BTC|ETH|USDT|USDC|USD|EUR|GBP)\b)/gi,
        ),
      ).slice(0, 20),
      kycMentions: /\b(kyc|know your customer|no-kyc|no kyc)\b/i.test(text),
      licenses: extractLicenses(text),
      provablyFair: /\bprovably fair\b/i.test(text),
      wallets: recurringMatches(lower, WALLET_TERMS),
      reviewSchema: schemaIncludes(input.metadata, 'review'),
      trustSignals: recurringMatches(lower, TRUST_TERMS),
      internalLinksCount: contentInternalHtmlLinks.length,
      anchorTexts: unique(
        contentInternalHtmlLinks.map((link) => link.anchor).filter(Boolean),
      ).slice(0, 30),
      hubPageReferences: unique(
        contentInternalHtmlLinks
          .filter((link) =>
            /casino|bonus|review|crypto|bitcoin|guide/i.test(
              link.anchor + link.url,
            ),
          )
          .map((link) => link.url),
      ).slice(0, 20),
      updatedYearMentions: unique(matchAll(text, /\b(?:20[2-3]\d)\b/g)).slice(
        0,
        12,
      ),
      latestBonuses: unique(
        matchAll(
          text,
          /\b(?:new|latest|updated|fresh|exclusive)\b[^.\n]{0,90}\bbonus(?:es)?\b/gi,
        ),
      ).slice(0, 12),
      recentReleases: unique(
        matchAll(
          text,
          /\b(?:new|latest|released|launch(?:ed)?|updated)\b[^.\n]{0,90}/gi,
        ),
      ).slice(0, 12),
      freshnessSignals: unique([
        ...matchAll(text, /\b(?:20[2-3]\d)\b/g),
        ...matchAll(
          text,
          /\b(?:new|latest|updated|fresh|exclusive)\b[^.\n]{0,90}\bbonus(?:es)?\b/gi,
        ),
        ...matchAll(
          text,
          /\b(?:new|latest|released|launch(?:ed)?|updated)\b[^.\n]{0,90}/gi,
        ),
      ]).slice(0, 20),
      hreflang: extractMetadataArray(input.metadata, 'hreflang'),
      localizedCurrencies: recurringMatches(lower, LOCALIZED_CURRENCY_TERMS),
      countryTargeting: recurringMatches(lower, COUNTRY_TERMS),
    };
  }
}

function extractionQuality(
  metadata: Record<string, unknown> | undefined,
  text: string,
  wordCount: number,
): ExtractionQuality {
  const statusCode = Number(metadata?.statusCode);
  const lower = text.toLowerCase();

  if (
    statusCode === 403 ||
    /attention required|cloudflare|verify you are human|access denied|captcha/.test(
      lower,
    )
  ) {
    return 'blocked_by_cloudflare';
  }

  if (/enable javascript|javascript is required|please enable js/.test(lower)) {
    return 'js_render_failed';
  }

  if (wordCount < 250) {
    return 'insufficient_content';
  }

  return 'extraction_success';
}

const MONEY_KEYWORDS = [
  'bonus',
  'bonuses',
  'free spins',
  'cashback',
  'deposit',
  'withdrawal',
  'payout',
  'no kyc',
  'crypto casino',
  'bitcoin casino',
  'jackpot',
  'sportsbook',
];

const URGENCY_TERMS = [
  'instant',
  'fast',
  'today',
  'now',
  'limited time',
  'exclusive',
  'new',
  'latest',
  'same day',
];
const WALLET_TERMS = [
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
  'usdt',
  'usdc',
  'litecoin',
  'ltc',
  'dogecoin',
  'wallet',
];
const TRUST_TERMS = [
  'licensed',
  'license',
  'regulated',
  'audited',
  'secure',
  'ssl',
  'responsible gambling',
  'terms',
  'privacy',
];
const LOCALIZED_CURRENCY_TERMS = [
  'usd',
  'eur',
  'gbp',
  'cad',
  'aud',
  'nok',
  'sek',
  'brl',
  'inr',
];
const COUNTRY_TERMS = [
  'usa',
  'united states',
  'uk',
  'canada',
  'australia',
  'norway',
  'sweden',
  'finland',
  'germany',
  'brazil',
  'india',
];

function extractHeadings(markdown: string) {
  return markdown.split('\n').reduce(
    (headings, line) => {
      const match = line.trim().match(/^(#{1,3})\s+(.+)$/);
      if (!match) return headings;
      if (match[1] === '#') headings.h1.push(match[2]);
      if (match[1] === '##') headings.h2.push(match[2]);
      if (match[1] === '###') headings.h3.push(match[2]);
      return headings;
    },
    { h1: [] as string[], h2: [] as string[], h3: [] as string[] },
  );
}

function normalizeText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMarkdownTables(markdown: string) {
  const lines = markdown.split('\n');
  return lines.filter(
    (line, index) =>
      line.includes('|') &&
      /^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1] ?? ''),
  ).length;
}

function extractMarkdownLinks(markdown: string) {
  return [...markdown.matchAll(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g)].map(
    (match) => {
      const rawAnchor = match[1] ?? '';
      const rawUrl = match[2] ?? '';
      const { url: parsedUrl } = parseMarkdownLinkTarget(rawUrl);
      const isImageLink =
        /^\s*!\[/.test(rawAnchor) || /!\[[^\]]*]\([^)]*\)/.test(rawAnchor);

      return {
        anchor: normalizeAnchorText(rawAnchor),
        url: parsedUrl,
        isImageLink,
      };
    },
  );
}

function normalizeAnchorText(value: string) {
  return value
    .trim()
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^!\[?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMarkdownLinkTarget(rawTarget: string) {
  const trimmed = rawTarget.trim();
  if (!trimmed) return { url: '' };

  if (trimmed.startsWith('<')) {
    const close = trimmed.indexOf('>');
    if (close > 1) {
      return { url: trimmed.slice(1, close).trim() };
    }
  }

  const firstToken = trimmed.split(/\s+/)[0] ?? '';
  return { url: firstToken.trim() };
}

function isLikelyHtmlPageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const pathname = parsed.pathname.toLowerCase();
    if (pathname.startsWith('/cdn-cgi/')) return false;
    if (pathname.includes('/wp-content/uploads/')) return false;

    const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
    const hasExtension = lastSegment.includes('.') && !lastSegment.endsWith('.');
    if (!hasExtension) return true;

    const extension = `.${lastSegment.split('.').pop() ?? ''}`;
    const htmlExtensions = new Set(['.html', '.htm', '.php', '.aspx', '.asp']);
    if (htmlExtensions.has(extension)) return true;

    const nonHtmlExtensions = new Set([
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.ico',
      '.pdf',
      '.zip',
      '.rar',
      '.7z',
      '.mp3',
      '.wav',
      '.mp4',
      '.mov',
      '.webm',
      '.css',
      '.js',
      '.mjs',
      '.json',
      '.xml',
      '.txt',
      '.csv',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
    ]);

    return !nonHtmlExtensions.has(extension);
  } catch {
    return false;
  }
}

function stripEncodedMarkdownTitle(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (/%20%22/i.test(pathname) && /%22$/i.test(pathname)) {
      parsed.pathname = pathname.replace(/(?:\/)?%20%22[^/]*%22$/i, '');
      if (!parsed.pathname) parsed.pathname = '/';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function isInternalLink(domain: string, url: string) {
  try {
    return (
      new URL(url).hostname.replace(/^www\./, '') ===
      domain.replace(/^www\./, '')
    );
  } catch {
    return false;
  }
}

function normalizeUrlForComparison(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function extractEntities(text: string) {
  return unique(
    matchAll(
      text,
      /\b(?:Bitcoin|Ethereum|Litecoin|Dogecoin|Tether|USDT|USDC|BTC|ETH|KYC|VPN|Visa|Mastercard|Apple Pay|Google Pay)\b/g,
    ),
  ).slice(0, 30);
}

function semanticClusters(lower: string) {
  const clusters = {
    bonuses: ['bonus', 'free spins', 'cashback', 'promo', 'promotion'].filter(
      (term) => lower.includes(term),
    ),
    payments: [
      'deposit',
      'withdrawal',
      'payout',
      'wallet',
      'bitcoin',
      'usdt',
    ].filter((term) => lower.includes(term)),
    trust: ['license', 'regulated', 'secure', 'provably fair', 'kyc'].filter(
      (term) => lower.includes(term),
    ),
    games: [
      'slots',
      'live casino',
      'table games',
      'blackjack',
      'roulette',
      'sportsbook',
    ].filter((term) => lower.includes(term)),
    geo: COUNTRY_TERMS.filter((term) => lower.includes(term)),
  };

  return Object.fromEntries(
    Object.entries(clusters).filter(([, values]) => values.length > 0),
  );
}

function keywordFrequency(lower: string, terms: string[]) {
  return Object.fromEntries(
    unique(terms)
      .map(
        (term) =>
          [
            term,
            countMatches(
              lower,
              new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'g'),
            ),
          ] as const,
      )
      .filter(([, count]) => count > 0),
  );
}

function keywordPhraseCandidates(
  keyword: string,
  text: string,
  seoText: string,
) {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const combined = `${text} ${seoText}`.toLowerCase();
  const candidates = new Set<string>([normalizedKeyword]);

  const phraseRegexes = [
    /\b(?:best|top|leading|trusted|safe|fast(?:est)?|instant|new)\s+(?:crypto|bitcoin|btc)\s+(?:casino|casinos|gambling sites?|betting sites?)\b/gi,
    /\b(?:crypto|bitcoin|btc)\s+(?:casino|casinos|gambling sites?|betting sites?)\b/gi,
    /\b(?:no\s?kyc|anonymous|instant withdrawal|fast payout)\s+(?:crypto|bitcoin|btc)?\s*(?:casino|casinos|gambling sites?)\b/gi,
    /\b(?:best|top)\s+\d{1,2}\s+(?:crypto|bitcoin|btc)\s+(?:casino|casinos|gambling sites?)\b/gi,
  ];

  for (const regex of phraseRegexes) {
    for (const phrase of matchAll(combined, regex)) {
      candidates.add(phrase.toLowerCase().replace(/\s+/g, ' ').trim());
    }
  }

  const tokens = normalizedKeyword
    .split(/\s+/)
    .filter((token) => token.length > 2);
  if (tokens.length >= 2) {
    const words = combined.split(/[^a-z0-9]+/).filter(Boolean);
    for (let size = 2; size <= 5; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const phrase = words.slice(index, index + size);
        const hitCount = tokens.filter((token) =>
          phrase.includes(token),
        ).length;
        if (
          hitCount >= Math.min(2, tokens.length) &&
          /casino|casinos|gambling|betting/.test(phrase.join(' '))
        ) {
          candidates.add(phrase.join(' '));
        }
      }
    }
  }

  return [...candidates].slice(0, 80);
}

function countCtas(lower: string) {
  return countMatches(
    lower,
    /\b(play now|get started|sign up|join now|claim|claim bonus|visit site|bet now|register|open account)\b/g,
  );
}

function extractCtaWording(markdown: string) {
  return unique(
    matchAll(
      markdown,
      /\b(?:Play Now|Get Started|Sign Up|Join Now|Claim(?: Bonus)?|Visit Site|Bet Now|Register|Open Account)\b/g,
    ),
  ).slice(0, 20);
}

function extractLicenses(text: string) {
  return unique(
    matchAll(
      text,
      /\b(?:curacao|malta|mga|ukgc|gibraltar|isle of man|license[ds]?|regulated)\b/gi,
    ),
  ).slice(0, 20);
}

function schemaIncludes(
  metadata: Record<string, unknown> | undefined,
  needle: string,
) {
  return JSON.stringify(metadata ?? {})
    .toLowerCase()
    .includes(needle);
}

function hasSchema(metadata: Record<string, unknown> | undefined) {
  const serialized = JSON.stringify(metadata ?? {}).toLowerCase();
  return (
    serialized.includes('schema') ||
    serialized.includes('json-ld') ||
    serialized.includes('ld+json')
  );
}

function extractMetadataArray(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

function recurringMatches(lower: string, terms: string[]) {
  return terms.filter((term) => lower.includes(term));
}

function countMatches(text: string, regex: RegExp) {
  return [...text.matchAll(regex)].length;
}

function matchAll(text: string, regex: RegExp) {
  return [...text.matchAll(regex)].map((match) => match[0].trim());
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
