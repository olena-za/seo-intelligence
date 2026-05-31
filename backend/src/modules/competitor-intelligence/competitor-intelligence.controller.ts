import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CompetitorIntelligenceService } from './competitor-intelligence.service';
import { CreateKeywordSnapshotDto } from './dto/create-keyword-snapshot.dto';

@Controller('competitor-intelligence')
export class CompetitorIntelligenceController {
  constructor(
    private readonly competitorIntelligence: CompetitorIntelligenceService,
  ) {}

  @Post('snapshots')
  createSnapshot(@Body() dto: CreateKeywordSnapshotDto) {
    return this.competitorIntelligence.createKeywordSnapshot(dto);
  }

  @Get('snapshots')
  latestSnapshots(@Query('limit') limit?: string) {
    return this.competitorIntelligence.latestSnapshots(
      limit ? Number(limit) : 5,
    );
  }

  @Get('snapshots/:id')
  getSnapshot(@Param('id') id: string) {
    return this.competitorIntelligence.getSnapshot(id);
  }

  @Get('pages/:id')
  getPage(@Param('id') id: string) {
    return this.competitorIntelligence.getPage(id);
  }
}
