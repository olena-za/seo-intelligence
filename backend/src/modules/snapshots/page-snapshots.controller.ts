import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PageSnapshotsService } from './page-snapshots.service';
import { CrawlPageDto } from './dto/crawl-page.dto';
import { CreatePageSnapshotDto } from './dto/create-page-snapshot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('page-snapshots')
@UseGuards(JwtAuthGuard)
export class PageSnapshotsController {
  constructor(private readonly pageSnapshotsService: PageSnapshotsService) {}

  @Post('crawl')
  async crawlAndSnapshot(
    @Body() dto: CrawlPageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.pageSnapshotsService.crawlAndSnapshot(
      dto.projectId,
      dto.url,
      request.user.sub,
    );
  }

  @Post()
  async create(
    @Body() dto: CreatePageSnapshotDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.pageSnapshotsService.create(dto, request.user.sub);
  }

  @Get()
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    return this.pageSnapshotsService.findAll(request.user.sub, projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.pageSnapshotsService.findOne(id, request.user.sub);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.pageSnapshotsService.remove(id, request.user.sub);
  }

  @Get('page/:pageId')
  async getPageSnapshots(
    @Param('pageId') pageId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.pageSnapshotsService.getPageSnapshots(pageId, request.user.sub);
  }
}
