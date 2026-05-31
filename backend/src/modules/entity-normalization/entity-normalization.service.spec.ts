import { EntityNormalizationService } from './entity-normalization.service';

describe('EntityNormalizationService', () => {
  const service = new EntityNormalizationService();

  it('canonicalizes bitcoin/btc variants into crypto casino', () => {
    expect(service.normalize('btc casino').canonical).toBe('crypto casino');
    expect(service.normalize('bitcoin casinos').canonical).toBe(
      'crypto casino',
    );
  });

  it('groups phrase variants by strategic cluster', () => {
    const grouped = service.group([
      'no kyc casino',
      'instant withdrawals',
      'provably fair',
    ]);

    expect(grouped.privacy).toContain('no kyc casino');
    expect(grouped.payments).toContain('instant withdrawal');
    expect(grouped.trust).toContain('provably fair');
  });
});
