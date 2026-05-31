import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FirecrawlService } from '../../firecrawl/firecrawl.service';
import { SeoAnalysisService } from '../analysis/seo-analysis.service';
import {
  hashContent,
  normalizeContent,
  extractHeadings,
} from '../../utils/content-normalizer';
import { CreatePageSnapshotDto } from './dto/create-page-snapshot.dto';

@Injectable()
export class PageSnapshotsService {
  private readonly logger = new Logger(PageSnapshotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firecrawlService: FirecrawlService,
    private readonly seoAnalysisService: SeoAnalysisService,
  ) {}

  async crawlAndSnapshot(projectId: string, url: string, userId: string) {
    await this.ensureProject(projectId, userId);
    this.logger.log(`Starting crawl for ${url}`);

    // Fetch or create Page record
    const page = await this.prisma.page.upsert({
      where: { projectId_url: { projectId, url } },
      update: {},
      create: {
        projectId,
        url,
        domain: this.extractDomain(url),
      },
    });

    // Crawl the page using Firecrawl
    const crawlData = await this.firecrawlService.crawlUrl(url);

    // Extract content
    const markdown = crawlData.markdown ?? '';
    const cleanText = crawlData.text ?? normalizeContent(crawlData.html ?? '');
    const html = crawlData.html ?? '';
    const headings = extractHeadings(html);

    // Calculate content hash for change detection
    const contentHash = hashContent(cleanText);

    // Extract links
    const internalLinks = (crawlData.internal_links ?? []) as string[];
    const externalLinks = (crawlData.external_links ?? []) as string[];

    // Calculate SEO metrics
    const seoMetrics = this.seoAnalysisService.analyze({
      cleanText,
      headings,
      internalLinks,
      externalLinks,
      anchorTexts: [...internalLinks, ...externalLinks],
    });

    // Create page snapshot
    const snapshot = await this.prisma.pageSnapshot.create({
      data: {
        projectId,
        pageId: page.id,
        markdown,
        cleanText,
        html,
        metadata: crawlData.metadata ?? {},
        h1: headings.h1,
        h2: headings.h2,
        h3: headings.h3,
        internalLinks,
        externalLinks,
        contentHash,
        lastModified: new Date(crawlData.last_modified ?? Date.now()),
        seoMetrics: {
          create: {
            ...seoMetrics,
          },
        },
      },
      include: { seoMetrics: true },
    });

    this.logger.log(`Page snapshot created for ${url}`);
    return snapshot;
  }

  async getPageSnapshots(pageId: string, userId: string) {
    return this.prisma.pageSnapshot.findMany({
      where: { pageId, project: { userId } },
      orderBy: { snapshotDate: 'desc' },
      include: { seoMetrics: true, aiAnalysis: true },
    });
  }

  async create(dto: CreatePageSnapshotDto, userId: string) {
    await this.ensureProject(dto.projectId, userId);

    const page = await this.prisma.page.upsert({
      where: { projectId_url: { projectId: dto.projectId, url: dto.url } },
      update: { title: dto.title },
      create: {
        projectId: dto.projectId,
        url: dto.url,
        domain: this.extractDomain(dto.url),
        title: dto.title,
      },
    });

    return this.prisma.pageSnapshot.create({
      data: {
        projectId: dto.projectId,
        pageId: page.id,
        markdown: dto.markdown,
        cleanText: dto.cleanText,
        html: dto.html,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        h1: dto.h1 ?? [],
        h2: dto.h2 ?? [],
        h3: dto.h3 ?? [],
        internalLinks: [],
        externalLinks: [],
        contentHash: dto.cleanText ? hashContent(dto.cleanText) : undefined,
      },
      include: { page: true, seoMetrics: true, aiAnalysis: true },
    });
  }

  async findAll(userId: string, projectId?: string) {
    return this.prisma.pageSnapshot.findMany({
      where: {
        projectId,
        project: { userId },
      },
      orderBy: { snapshotDate: 'desc' },
      include: { page: true, seoMetrics: true, aiAnalysis: true },
    });
  }

  async findOne(id: string, userId: string) {
    const snapshot = await this.prisma.pageSnapshot.findFirst({
      where: { id, project: { userId } },
      include: { page: true, seoMetrics: true, aiAnalysis: true },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return snapshot;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.pageSnapshot.delete({ where: { id } });
  }

  private async ensureProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private extractDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}
