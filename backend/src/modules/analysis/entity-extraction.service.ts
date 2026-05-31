import { Injectable } from '@nestjs/common';

export interface ExtractedEntity {
  name: string;
  type: string;
  frequency: number;
  positions: number[];
}

@Injectable()
export class EntityExtractionService {
  private readonly entityPatterns = {
    brand: [
      'apple',
      'google',
      'microsoft',
      'amazon',
      'meta',
      'nvidia',
      'tesla',
      'stripe',
    ],
    crypto_coin: [
      'bitcoin',
      'ethereum',
      'cardano',
      'solana',
      'ripple',
      'dogecoin',
      'litecoin',
      'polkadot',
    ],
    casino_provider: [
      'bet365',
      'draftkings',
      'fanduel',
      'caesars',
      'betmgm',
      'pointsbet',
      'barstool',
    ],
  };

  extractEntities(text: string): ExtractedEntity[] {
    const lowerText = text.toLowerCase();
    const entities: ExtractedEntity[] = [];
    const seenEntities = new Set<string>();

    for (const [type, names] of Object.entries(this.entityPatterns)) {
      for (const name of names) {
        if (!seenEntities.has(name)) {
          const regex = new RegExp(`\\b${this.escapeRegex(name)}\\b`, 'gi');
          const matches = Array.from(lowerText.matchAll(regex));

          if (matches.length > 0) {
            seenEntities.add(name);
            entities.push({
              name,
              type,
              frequency: matches.length,
              positions: matches.map((m) => m.index ?? 0),
            });
          }
        }
      }
    }

    return entities.sort((a, b) => b.frequency - a.frequency);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
