import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';

@Injectable()
export class CompetitorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompetitorDto, userId: string) {
    await this.ensureProject(dto.projectId, userId);

    return this.prisma.competitor.create({
      data: {
        project: { connect: { id: dto.projectId } },
        domain: dto.domain,
        name: dto.name,
      },
    });
  }

  async findAll(userId: string, projectId?: string) {
    return this.prisma.competitor.findMany({
      where: {
        projectId,
        project: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id, project: { userId } },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return competitor;
  }

  async update(id: string, dto: UpdateCompetitorDto, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.competitor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.competitor.delete({ where: { id } });
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
