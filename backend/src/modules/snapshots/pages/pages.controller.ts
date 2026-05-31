import { Controller, Get, Param } from '@nestjs/common';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(':pageId/snapshots')
  findSnapshots(@Param('pageId') pageId: string) {
    return this.pagesService.findSnapshots(pageId);
  }
}
