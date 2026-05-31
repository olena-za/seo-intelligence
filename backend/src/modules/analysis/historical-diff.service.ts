import { Injectable } from '@nestjs/common';
import { detectChangedSections, SectionDiff } from '../../utils/diff';

export interface DiffReport {
  wordCountDelta: number;
  headingChanges: SectionDiff[];
  sectionChanges: SectionDiff[];
  entityChanges: {
    newEntities: string[];
    removedEntities: string[];
    changedEntities: string[];
  };
  semanticShifts: string[];
  topicalExpansion: string[];
  topicalReduction: string[];
  changeSeverity: number; // 0-100
}

@Injectable()
export class HistoricalDiffService {
  generateDiff(
    previous: { wordCount: number; headings: string[]; entities: string[] },
    current: { wordCount: number; headings: string[]; entities: string[] },
  ): DiffReport {
    // Word count delta
    const wordCountDelta = current.wordCount - previous.wordCount;

    // Heading changes
    const headingChanges = detectChangedSections(
      previous.headings,
      current.headings,
    );

    // Entity changes
    const previousEntitySet = new Set(previous.entities);
    const currentEntitySet = new Set(current.entities);
    const newEntities = Array.from(currentEntitySet).filter(
      (e) => !previousEntitySet.has(e),
    );
    const removedEntities = Array.from(previousEntitySet).filter(
      (e) => !currentEntitySet.has(e),
    );
    const changedEntities = Array.from(previousEntitySet).filter((e) =>
      currentEntitySet.has(e),
    );

    // Calculate severity (0-100)
    const severity = Math.min(
      100,
      Math.abs(wordCountDelta) / 100 +
        headingChanges.length * 10 +
        newEntities.length * 5 +
        removedEntities.length * 5,
    );

    return {
      wordCountDelta,
      headingChanges,
      sectionChanges: [],
      entityChanges: { newEntities, removedEntities, changedEntities },
      semanticShifts: [],
      topicalExpansion: [],
      topicalReduction: [],
      changeSeverity: Math.min(100, severity),
    };
  }
}
