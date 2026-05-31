import { Injectable } from '@nestjs/common';

export interface KeywordAnalysis {
  exactFrequency: number;
  partialFrequency: number;
  density: number;
  positions: number[];
  firstOccurrence: number;
  lastOccurrence: number;
}

@Injectable()
export class KeywordIntelligenceService {
  analyzeKeyword(text: string, keyword: string): KeywordAnalysis {
    const words = text.split(/\s+/);
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // Exact frequency
    const exactRegex = new RegExp(
      `\\b${this.escapeRegex(lowerKeyword)}\\b`,
      'gi',
    );
    const exactMatches = lowerText.match(exactRegex) ?? [];
    const exactFrequency = exactMatches.length;

    // Partial frequency
    const partialRegex = new RegExp(this.escapeRegex(lowerKeyword), 'gi');
    const partialMatches = lowerText.match(partialRegex) ?? [];
    const partialFrequency = partialMatches.length;

    // Keyword density
    const density = (exactFrequency / words.length) * 100;

    // Positions
    const positions: number[] = [];
    const index = 0;
    let match;
    const regex = new RegExp(this.escapeRegex(lowerKeyword), 'gi');
    while ((match = regex.exec(lowerText)) !== null) {
      positions.push(match.index);
    }

    const firstOccurrence = positions.length > 0 ? positions[0] : -1;
    const lastOccurrence =
      positions.length > 0 ? positions[positions.length - 1] : -1;

    return {
      exactFrequency,
      partialFrequency,
      density,
      positions,
      firstOccurrence,
      lastOccurrence,
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
