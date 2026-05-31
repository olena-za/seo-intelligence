import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SerpService } from './serp.service';
import { CreateSerpSnapshotDto } from './dto/create-serp-snapshot.dto';
import { CollectSerpDto } from './dto/collect-serp.dto';
import { TestKeywordDto } from './dto/test-keyword.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevelopmentPublic } from '../auth/development-public.decorator';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('serp')
@UseGuards(JwtAuthGuard)
export class SerpController {
  constructor(private readonly serpService: SerpService) {}

  @Get('providers/status')
  @DevelopmentPublic()
  providerStatus() {
    return this.serpService.providerStatus();
  }

  @Post('test-keyword')
  @DevelopmentPublic()
  testKeyword(@Body() dto: TestKeywordDto) {
    // Local-only public debug route. It never writes to the database.
    return this.serpService.testKeyword(dto);
  }

  @Post('collect')
  @DevelopmentPublic()
  collect(@Body() dto: CollectSerpDto, @Req() request: AuthenticatedRequest) {
    return this.serpService.collect(dto, request.user?.sub);
  }

  @Get('project/:projectId/latest')
  latestByProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serpService.latestByProject(projectId, request.user.sub);
  }

  @Get('project/:projectId/history')
  historyByProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ) {
    return this.serpService.historyByProject(projectId, request.user.sub, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      orderBy,
    });
  }

  @Post('snapshots')
  createSnapshot(
    @Body() dto: CreateSerpSnapshotDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serpService.createSnapshot(dto, request.user.sub);
  }

  @Get('snapshots')
  findSnapshots(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
    @Query('keywordId') keywordId?: string,
  ) {
    return this.serpService.findSnapshots(request.user.sub, {
      projectId,
      keywordId,
    });
  }

  @Get('snapshots/:id')
  findSnapshot(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.serpService.findSnapshot(id, request.user.sub);
  }

  @Delete('snapshots/:id')
  removeSnapshot(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serpService.removeSnapshot(id, request.user.sub);
  }

  @Post('collect/:projectId/:keywordId')
  collectSerpData(
    @Param('projectId') projectId: string,
    @Param('keywordId') keywordId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serpService.collectSerpData(
      projectId,
      keywordId,
      request.user.sub,
    );
  }

  @Get('keywords/:keywordId')
  findByKeyword(
    @Param('keywordId') keywordId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serpService.findByKeyword(keywordId, request.user.sub);
  }

  @Get('results')
  findResults(
    @Req() request: AuthenticatedRequest,
    @Query('snapshotId') snapshotId?: string,
  ) {
    return this.serpService.findResults(request.user.sub, snapshotId);
  }

  @Delete('results/:id')
  removeResult(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.serpService.removeResult(id, request.user.sub);
  }
}
