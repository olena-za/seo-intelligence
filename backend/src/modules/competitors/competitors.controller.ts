import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CompetitorsService } from './competitors.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('competitors')
@UseGuards(JwtAuthGuard)
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Post()
  create(
    @Body() dto: CreateCompetitorDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.competitorsService.create(dto, request.user.sub);
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    return this.competitorsService.findAll(request.user.sub, projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.competitorsService.findOne(id, request.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompetitorDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.competitorsService.update(id, dto, request.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.competitorsService.remove(id, request.user.sub);
  }
}
