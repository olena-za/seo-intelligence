import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';

@Injectable()
export class KeywordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createKeywordDto: CreateKeywordDto, userId: string) {
    await this.ensureProject(createKeywordDto.projectId, userId);

    return this.prisma.keyword.create({
      data: {
        project: { connect: { id: createKeywordDto.projectId } },
        keyword: createKeywordDto.keyword,
        intent: createKeywordDto.intent,
        volume: createKeywordDto.volume,
        difficulty: createKeywordDto.difficulty,
      },
    });
  }

  async findAll(userId: string, projectId?: string) {
    return this.prisma.keyword.findMany({
      where: {
        projectId,
        project: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const keyword = await this.prisma.keyword.findFirst({
      where: { id, project: { userId } },
    });

    if (!keyword) {
      throw new NotFoundException('Keyword not found');
    }

    return keyword;
  }

  async update(id: string, dto: UpdateKeywordDto, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.keyword.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.keyword.delete({ where: { id } });
  }

  private async ensureProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
