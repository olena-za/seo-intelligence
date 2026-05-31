import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type SeoPageAnalysisInput = {
  keyword: string;
  url: string;
  title?: string | null;
  metaDescription?: string | null;
  headings?: unknown;
  bodyContent?: string | null;
  canonical?: string | null;
  schema?: unknown;
  internalLinks?: string[];
};

export type SeoPageAnalysisResult = {
  summary: string;
  scores: {
    searchIntentAlignment: number;
    semanticCoverage: number;
    entityCoverage: number;
    topicalDepth: number;
    eeatSignals: number;
    schemaQuality: number;
    internalLinkingQuality: number;
  };
  contentGaps: string[];
  optimizationOpportunities: string[];
  primaryIntent: string;
  entities: string[];
  schemaIssues: string[];
  internalLinkingNotes: string[];
};

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get<string>('openAiApiKey') });
  }

  async analyzeDiffSummary(summaryInput: string) {
    const prompt = `You are an SEO intelligence assistant. Analyze the following content diff summary and provide:
- a concise strategic summary
- topical gap opportunities
- intent shift signals
- semantic signal changes

Only use the diff summary provided; do not rewrite the full page.

Diff summary:
${summaryInput}`;

    const response = await this.client.responses.create({
      model: 'gpt-5-nano',
      input: prompt,
      max_output_tokens: 500,
    });

    const result = response.output_text ?? '';
    this.logger.log('OpenAI diff summary generated');
    return { result, tokens: response.usage?.total_tokens ?? 0 };
  }

  async classifyIntent(text: string) {
    const prompt = `Classify the primary and secondary search intent of the text below. Respond in JSON with keys primaryIntent and secondaryIntents:

Text:
${text}`;

    const response = await this.client.responses.create({
      model: 'gpt-5-nano',
      input: prompt,
      max_output_tokens: 200,
    });

    const jsonText = response.output_text ?? '';
    this.logger.log('OpenAI intent classification completed');
    return { result: jsonText, tokens: response.usage?.total_tokens ?? 0 };
  }

  async analyzeSeoPage(input: SeoPageAnalysisInput) {
    const prompt = `You are an SEO intelligence analyst. Analyze this page for the target keyword and return only valid JSON.

Target keyword: ${input.keyword}
URL: ${input.url}
Title: ${input.title ?? ''}
Meta description: ${input.metaDescription ?? ''}
Canonical: ${input.canonical ?? ''}
Headings JSON: ${JSON.stringify(input.headings ?? {})}
Schema JSON: ${JSON.stringify(input.schema ?? [])}
Internal links sample: ${JSON.stringify((input.internalLinks ?? []).slice(0, 40))}
Body content:
${(input.bodyContent ?? '').slice(0, 7000)}

Return exactly this JSON shape:
{
  "summary": "2-4 sentence executive SEO summary",
  "scores": {
    "searchIntentAlignment": 0,
    "semanticCoverage": 0,
    "entityCoverage": 0,
    "topicalDepth": 0,
    "eeatSignals": 0,
    "schemaQuality": 0,
    "internalLinkingQuality": 0
  },
  "contentGaps": ["gap"],
  "optimizationOpportunities": ["opportunity"],
  "primaryIntent": "informational",
  "entities": ["entity"],
  "schemaIssues": ["issue"],
  "internalLinkingNotes": ["note"]
}

All score values must be integers from 0 to 100.`;

    this.logger.log(
      `OpenAI SEO analysis request url=${input.url} keyword="${input.keyword}" contentChars=${(input.bodyContent ?? '').length}`,
    );

    const response = await this.client.responses.create({
      model: 'gpt-5-nano',
      input: prompt,
      max_output_tokens: 4000,
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_object' } },
    } as any);

    this.logger.debug(
      `OpenAI SEO response status: ${safeJson(responseSummary(response), 1200)}`,
    );
    const text = extractResponseText(response);
    this.logger.debug(
      `OpenAI SEO raw response preview: ${text.slice(0, 1200) || '[empty output_text]'}`,
    );
    const parsed = parseJsonObject(text);
    this.logger.log(
      `OpenAI SEO page analysis completed for ${input.url} tokens=${response.usage?.total_tokens ?? 0}`,
    );

    return {
      result: normalizeSeoAnalysis(parsed),
      rawText: text,
      tokens: response.usage?.total_tokens ?? 0,
    };
  }
}

function responseSummary(response: unknown) {
  if (typeof response !== 'object' || !response) return {};
  const data = response as Record<string, unknown>;
  return {
    id: data.id,
    status: data.status,
    incomplete_details: data.incomplete_details,
    usage: data.usage,
    outputTypes: Array.isArray(data.output)
      ? data.output
          .map((item) => {
            if (typeof item !== 'object' || !item) return null;
            const record = item as Record<string, unknown>;
            return {
              type: record.type,
              status: record.status,
              role: record.role,
              contentTypes: Array.isArray(record.content)
                ? record.content.map((contentItem) =>
                    typeof contentItem === 'object' && contentItem
                      ? (contentItem as Record<string, unknown>).type
                      : null,
                  )
                : [],
            };
          })
          .filter(Boolean)
      : [],
  };
}

function safeJson(value: unknown, maxLength: number) {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return '[unserializable]';
  }
}

function extractResponseText(response: unknown): string {
  if (typeof response !== 'object' || !response) return '';
  const data = response as Record<string, unknown>;
  if (typeof data.output_text === 'string' && data.output_text.trim())
    return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    if (typeof item !== 'object' || !item) continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (typeof contentItem !== 'object' || !contentItem) continue;
      const record = contentItem as Record<string, unknown>;
      if (typeof record.text === 'string') textParts.push(record.text);
      if (typeof record.output_text === 'string')
        textParts.push(record.output_text);
    }
  }

  return textParts.join('\n').trim();
}

function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(
        `OpenAI did not return JSON. Output preview: ${text.slice(0, 500) || '[empty]'}`,
      );
    }
    return JSON.parse(match[0]);
  }
}

function normalizeSeoAnalysis(value: unknown): SeoPageAnalysisResult {
  const data =
    typeof value === 'object' && value
      ? (value as Record<string, unknown>)
      : {};
  const scores =
    typeof data.scores === 'object' && data.scores
      ? (data.scores as Record<string, unknown>)
      : {};

  return {
    summary: stringValue(data.summary, 'No summary returned.'),
    scores: {
      searchIntentAlignment: scoreValue(scores.searchIntentAlignment),
      semanticCoverage: scoreValue(scores.semanticCoverage),
      entityCoverage: scoreValue(scores.entityCoverage),
      topicalDepth: scoreValue(scores.topicalDepth),
      eeatSignals: scoreValue(scores.eeatSignals),
      schemaQuality: scoreValue(scores.schemaQuality),
      internalLinkingQuality: scoreValue(scores.internalLinkingQuality),
    },
    contentGaps: stringArray(data.contentGaps),
    optimizationOpportunities: stringArray(data.optimizationOpportunities),
    primaryIntent: stringValue(data.primaryIntent, 'unknown'),
    entities: stringArray(data.entities),
    schemaIssues: stringArray(data.schemaIssues),
    internalLinkingNotes: stringArray(data.internalLinkingNotes),
  };
}

function scoreValue(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
