import { Injectable } from '@nestjs/common';
import {
  calculateSeoMetrics,
  SeoMetricsPayload,
} from '../../utils/seo-metrics';

@Injectable()
export class SeoAnalysisService {
  analyze(payload: SeoMetricsPayload) {
    return calculateSeoMetrics(payload);
  }
}
