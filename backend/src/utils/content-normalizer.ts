import { JSDOM } from 'jsdom';
import { hashContent } from './hash';

export { hashContent };

export function normalizeContent(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const text = document.body.textContent ?? '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized;
}

export function extractHeadings(html: string) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  return {
    h1: Array.from(document.querySelectorAll('h1')).map(
      (el) => (el as HTMLHeadingElement).textContent?.trim() ?? '',
    ),
    h2: Array.from(document.querySelectorAll('h2')).map(
      (el) => (el as HTMLHeadingElement).textContent?.trim() ?? '',
    ),
    h3: Array.from(document.querySelectorAll('h3')).map(
      (el) => (el as HTMLHeadingElement).textContent?.trim() ?? '',
    ),
  };
}
