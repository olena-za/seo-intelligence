import { Injectable } from '@nestjs/common';
import type {
  DataForSeoItem,
  DataForSeoResponse,
  NormalizedSerpCollection,
  NormalizedSerpResult,
} from './dataforseo.types';

@Injectable()
export class DataForSeoMapper {
  normalize(
    response: DataForSeoResponse,
    requestDurationMs: number,
  ): NormalizedSerpCollection {
    const task = response.tasks?.[0];
    const result = task?.result?.[0];
    const items = result?.items ?? [];
    const normalized = this.normalizeItems(items);
    const resultTypes = [...new Set(normalized.map((item) => item.itemType))];
    const organicResultsCount = normalized.filter(
      (item) => item.itemType === 'organic',
    ).length;
    const hasTaskErrors = Boolean(
      response.tasks_error && response.tasks_error > 0,
    );

    return {
      provider: 'dataforseo',
      rawResponse: response,
      requestDurationMs,
      totalResults: result?.total_count ?? normalized.length,
      organicResultsCount,
      resultTypes,
      status: hasTaskErrors
        ? 'partial'
        : normalized.length > 0
          ? 'success'
          : 'failed',
      errorMessage: hasTaskErrors
        ? (task?.status_message ?? response.status_message)
        : normalized.length
          ? undefined
          : 'Empty SERP response',
      results: normalized,
    };
  }

  private normalizeItems(items: DataForSeoItem[]): NormalizedSerpResult[] {
    return items.flatMap((item, index) => this.normalizeItem(item, index + 1));
  }

  private normalizeItem(
    item: DataForSeoItem,
    fallbackPosition: number,
  ): NormalizedSerpResult[] {
    const type = mapItemType(item.type);
    const base: NormalizedSerpResult = {
      position:
        item.rank_absolute ??
        item.rank_group ??
        item.position ??
        fallbackPosition,
      rankGroup: item.rank_group,
      rankAbsolute: item.rank_absolute,
      xpath: item.xpath,
      itemType: type,
      title: item.title,
      url: item.url,
      domain: item.domain ?? extractDomain(item.url),
      snippet: item.description,
      breadcrumb: item.breadcrumb,
      isFeatured: type === 'featured_snippet',
      isPaid: type === 'paid',
      sitelinks: item.links?.map((link) => ({
        title: link.title,
        url: link.url,
        description: link.description,
      })),
    };

    if (type === 'people_also_ask' && item.items?.length) {
      return [
        base,
        ...item.items.map(
          (child, childIndex) =>
            ({
              position: base.position,
              rankGroup: base.rankGroup,
              rankAbsolute: base.rankAbsolute,
              xpath: child.xpath ?? base.xpath,
              itemType: 'people_also_ask',
              title: child.title,
              url: child.url,
              domain: child.domain ?? extractDomain(child.url),
              snippet: child.description,
              breadcrumb: child.breadcrumb,
              isFeatured: false,
              isPaid: false,
            }) satisfies NormalizedSerpResult,
        ),
      ];
    }

    if (type === 'related_search' && item.items?.length) {
      return item.items.map((child, childIndex) => ({
        position: child.rank_absolute ?? childIndex + 1,
        rankGroup: child.rank_group,
        rankAbsolute: child.rank_absolute,
        xpath: child.xpath,
        itemType: 'related_search',
        title: child.title,
        url: child.url,
        domain: child.domain ?? extractDomain(child.url),
        snippet: child.description,
        breadcrumb: child.breadcrumb,
        isFeatured: false,
        isPaid: false,
      }));
    }

    return [base];
  }
}

function mapItemType(type?: string): string {
  switch (type) {
    case 'organic':
      return 'organic';
    case 'featured_snippet':
    case 'answer_box':
      return 'featured_snippet';
    case 'people_also_ask':
      return 'people_also_ask';
    case 'related_searches':
    case 'related_search':
      return 'related_search';
    case 'ai_overview':
      return 'ai_overview';
    case 'paid':
    case 'paid_search':
      return 'paid';
    default:
      return type ?? 'unknown';
  }
}

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
