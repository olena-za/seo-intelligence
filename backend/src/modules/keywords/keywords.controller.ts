import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('keywords')
@UseGuards(JwtAuthGuard)
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post()
  create(@Body() dto: CreateKeywordDto, @Req() request: AuthenticatedRequest) {
    return this.keywordsService.create(dto, request.user.sub);
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    return this.keywordsService.findAll(request.user.sub, projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.keywordsService.findOne(id, request.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateKeywordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.keywordsService.update(id, dto, request.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.keywordsService.remove(id, request.user.sub);
  }
}
