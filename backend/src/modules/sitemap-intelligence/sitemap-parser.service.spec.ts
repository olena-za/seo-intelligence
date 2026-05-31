import { SitemapParserService } from './sitemap-parser.service';

describe('SitemapParserService', () => {
  const parser = new SitemapParserService();

  it('extracts sitemap declarations from robots.txt', () => {
    const urls = parser.extractSitemapUrls(
      'User-agent: *\nSitemap: https://example.com/sitemap.xml',
      'example.com',
    );

    expect(urls).toEqual(['https://example.com/sitemap.xml']);
  });

  it('parses sitemap index URLs', () => {
    const xml =
      '<sitemapindex><sitemap><loc>https://example.com/post-sitemap.xml</loc></sitemap></sitemapindex>';

    expect(parser.isSitemapIndex(xml)).toBe(true);
    expect(parser.parseSitemapIndex(xml)).toEqual([
      'https://example.com/post-sitemap.xml',
    ]);
  });

  it('parses urlsets with lastmod/changefreq/priority', () => {
    const xml = `
      <urlset>
        <url>
          <loc>https://example.com/no-kyc/</loc>
          <lastmod>2026-05-01</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      </urlset>
    `;

    const rows = parser.parseUrlSet(xml);

    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe('https://example.com/no-kyc/');
    expect(rows[0].changefreq).toBe('weekly');
    expect(rows[0].priority).toBe(0.8);
  });
});
