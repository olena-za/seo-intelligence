import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SemanticAnalysisService } from './semantic-analysis.service';
import { EntityExtractionService } from './entity-extraction.service';
import { KeywordIntelligenceService } from './keyword-intelligence.service';
import { HistoricalDiffService } from './historical-diff.service';
import { AnalyzeTextDto } from './dto/analyze-text.dto';
import { AnalyzeKeywordDto } from './dto/analyze-keyword.dto';
import { HistoricalDiffDto } from './dto/historical-diff.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(
    private readonly semanticAnalysis: SemanticAnalysisService,
    private readonly entityExtraction: EntityExtractionService,
    private readonly keywordIntelligence: KeywordIntelligenceService,
    private readonly historicalDiff: HistoricalDiffService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateAnalysisDto,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.ensureSnapshot(dto.pageSnapshotId, request.user.sub);

    return this.prisma.aIAnalysis.create({
      data: dto,
    });
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    return this.prisma.aIAnalysis.findMany({
      where: {
        pageSnapshot: {
          projectId,
          project: { userId: request.user.sub },
        },
      },
      orderBy: { analyzedAt: 'desc' },
      include: { pageSnapshot: { include: { page: true } } },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.prisma.aIAnalysis.findFirst({
      where: { id, pageSnapshot: { project: { userId: request.user.sub } } },
      include: { pageSnapshot: { include: { page: true } } },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const analysis = await this.prisma.aIAnalysis.findFirst({
      where: { id, pageSnapshot: { project: { userId: request.user.sub } } },
    });

    if (!analysis) {
      return null;
    }

    return this.prisma.aIAnalysis.delete({ where: { id } });
  }

  @Post('semantic-groups')
  analyzeSemanticGroups(@Body() body: AnalyzeTextDto) {
    return this.semanticAnalysis.analyzeSemanticGroups(body.text);
  }

  @Post('entities')
  extractEntities(@Body() body: AnalyzeTextDto) {
    return this.entityExtraction.extractEntities(body.text);
  }

  @Post('keyword-analysis')
  analyzeKeyword(@Body() body: AnalyzeKeywordDto) {
    return this.keywordIntelligence.analyzeKeyword(body.text, body.keyword);
  }

  @Post('historical-diff')
  generateHistoricalDiff(
    @Body()
    body: HistoricalDiffDto,
  ) {
    return this.historicalDiff.generateDiff(body.previous, body.current);
  }

  private async ensureSnapshot(pageSnapshotId: string, userId: string) {
    const snapshot = await this.prisma.pageSnapshot.findFirst({
      where: { id: pageSnapshotId, project: { userId } },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }
  }
}
