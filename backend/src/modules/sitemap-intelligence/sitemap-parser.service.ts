import { Injectable } from '@nestjs/common';

export type ParsedSitemapUrl = {
  url: string;
  lastmod?: Date;
  changefreq?: string;
  priority?: number;
};

@Injectable()
export class SitemapParserService {
  extractSitemapUrls(robotsTxt: string, domain: string) {
    const explicit = robotsTxt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^sitemap:/i.test(line))
      .map((line) => line.replace(/^sitemap:\s*/i, '').trim())
      .filter(Boolean);

    if (explicit.length) return [...new Set(explicit)];
    return [`https://${domain}/sitemap.xml`];
  }

  isSitemapIndex(xml: string) {
    return /<sitemapindex[\s>]/i.test(xml);
  }

  parseSitemapIndex(xml: string) {
    return matchBlocks(xml, 'sitemap')
      .map((block) => textTag(block, 'loc'))
      .filter((value): value is string => Boolean(value));
  }

  parseUrlSet(xml: string): ParsedSitemapUrl[] {
    return matchBlocks(xml, 'url')
      .map((block) => {
        const url = textTag(block, 'loc');
        if (!url) return null;

        const row: ParsedSitemapUrl = { url };
        const lastmod = dateValue(textTag(block, 'lastmod'));
        const changefreq = textTag(block, 'changefreq');
        const priority = numberValue(textTag(block, 'priority'));

        if (lastmod) row.lastmod = lastmod;
        if (changefreq) row.changefreq = changefreq;
        if (priority !== undefined) row.priority = priority;

        return row;
      })
      .filter((item): item is ParsedSitemapUrl => Boolean(item));
  }
}

function matchBlocks(xml: string, tag: string) {
  return [
    ...xml.matchAll(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi')),
  ].map((match) => match[0]);
}

function textTag(xml: string, tag: string) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  );
  return match?.[1]
    ?.trim()
    .replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')
    .replace(/&amp;/g, '&');
}

function dateValue(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function numberValue(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
