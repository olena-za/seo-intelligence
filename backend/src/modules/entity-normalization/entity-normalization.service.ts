import { Injectable } from '@nestjs/common';

export type NormalizedEntity = {
  source: string;
  canonical: string;
  cluster: string;
};

const ENTITY_RULES: Array<{
  canonical: string;
  cluster: string;
  aliases: RegExp[];
}> = [
  {
    canonical: 'crypto casino',
    cluster: 'casino_intent',
    aliases: [
      /\bcrypto casinos?\b/i,
      /\bbitcoin casinos?\b/i,
      /\bbtc casinos?\b/i,
    ],
  },
  {
    canonical: 'no kyc casino',
    cluster: 'privacy',
    aliases: [/\bno[\s-]?kyc casinos?\b/i, /\banonymous casinos?\b/i],
  },
  {
    canonical: 'instant withdrawal',
    cluster: 'payments',
    aliases: [/\binstant withdrawals?\b/i, /\bfast payouts?\b/i],
  },
  {
    canonical: 'welcome bonus',
    cluster: 'bonus',
    aliases: [/\bwelcome bonuses?\b/i, /\bsign[ -]?up bonuses?\b/i],
  },
  {
    canonical: 'provably fair',
    cluster: 'trust',
    aliases: [/\bprovably fair\b/i],
  },
  {
    canonical: 'telegram casino',
    cluster: 'channel_expansion',
    aliases: [/\btelegram casinos?\b/i],
  },
  {
    canonical: 'solana casino',
    cluster: 'coin_expansion',
    aliases: [/\bsolana casinos?\b/i, /\bsol casinos?\b/i],
  },
  {
    canonical: 'prediction market',
    cluster: 'category_expansion',
    aliases: [/\bprediction markets?\b/i],
  },
];

@Injectable()
export class EntityNormalizationService {
  normalizeMany(values: string[]): NormalizedEntity[] {
    return [
      ...new Set(values.map((value) => value.trim()).filter(Boolean)),
    ].map((source) => this.normalize(source));
  }

  normalize(source: string): NormalizedEntity {
    const rule = ENTITY_RULES.find((item) =>
      item.aliases.some((alias) => alias.test(source)),
    );
    return {
      source,
      canonical:
        rule?.canonical ?? source.toLowerCase().replace(/\s+/g, ' ').trim(),
      cluster: rule?.cluster ?? 'other',
    };
  }

  group(values: string[]) {
    return this.normalizeMany(values).reduce<Record<string, string[]>>(
      (acc, entity) => {
        acc[entity.cluster] = [
          ...(acc[entity.cluster] ?? []),
          entity.canonical,
        ];
        acc[entity.cluster] = [...new Set(acc[entity.cluster])];
        return acc;
      },
      {},
    );
  }

  classifyPath(path: string) {
    const normalized = path.toLowerCase().replace(/[-_/]+/g, ' ');
    const entity = this.normalize(normalized);
    return entity.cluster === 'other' ? undefined : entity.canonical;
  }
}
