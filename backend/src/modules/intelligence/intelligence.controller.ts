import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';
import { RunIntelligenceDto } from './dto/run-intelligence.dto';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post('projects/:projectId/run')
  runProjectKeyword(
    @Param('projectId') projectId: string,
    @Body() dto: RunIntelligenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.intelligenceService.runProjectKeyword(
      projectId,
      dto.keyword,
      request.user.sub,
    );
  }

  @Get('projects/:projectId')
  getProjectIntelligence(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.intelligenceService.getProjectIntelligence(
      projectId,
      request.user.sub,
    );
  }

  @Get('keywords/:keywordId')
  getKeywordIntelligence(
    @Param('keywordId') keywordId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.intelligenceService.getKeywordIntelligence(
      keywordId,
      request.user.sub,
    );
  }
}
