import { Injectable } from '@nestjs/common';

export interface SemanticGroup {
  category: string;
  keywords: string[];
  prominence: number; // 0-100
}

@Injectable()
export class SemanticAnalysisService {
  private readonly semanticMaps = {
    trust: [
      'trust',
      'reliable',
      'secure',
      'legitimate',
      'verified',
      'certified',
      'authentic',
      'credible',
      'safe',
    ],
    speed: [
      'fast',
      'speed',
      'quick',
      'rapid',
      'instant',
      'performance',
      'latency',
      'slow',
      'faster',
    ],
    privacy: [
      'privacy',
      'private',
      'secure',
      'encryption',
      'confidential',
      'anonymous',
      'data',
      'protection',
    ],
    crypto: [
      'crypto',
      'bitcoin',
      'ethereum',
      'blockchain',
      'nft',
      'defi',
      'token',
      'web3',
    ],
    bonuses: [
      'bonus',
      'bonus code',
      'welcome bonus',
      'free bonus',
      'deposit bonus',
      'reward',
      'promotion',
    ],
    gambling: [
      'casino',
      'poker',
      'slots',
      'roulette',
      'blackjack',
      'gambling',
      'bet',
      'odds',
      'jackpot',
    ],
  };

  analyzeSemanticGroups(text: string): SemanticGroup[] {
    const lowerText = text.toLowerCase();
    const groups: SemanticGroup[] = [];

    for (const [category, keywords] of Object.entries(this.semanticMaps)) {
      let matchCount = 0;

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
        const matches = lowerText.match(regex) ?? [];
        matchCount += matches.length;
      }

      const prominence = Math.min(
        100,
        (matchCount / text.split(/\s+/).length) * 1000,
      );

      if (matchCount > 0) {
        groups.push({ category, keywords: keywords.slice(0, 5), prominence });
      }
    }

    return groups.sort((a, b) => b.prominence - a.prominence);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
