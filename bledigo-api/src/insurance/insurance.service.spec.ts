import { InsuranceService } from './insurance.service';
import { InsuranceType } from '../common/enums';

describe('InsuranceService - tarification', () => {
  const service = new InsuranceService({} as any);

  it('calcule une prime annulation de 5%', () => {
    const q = service.quote(1000, InsuranceType.cancellation);
    expect(q.premiumAmount).toBe(50);
    expect(q.coverageAmount).toBe(1000);
  });

  it('couvre le double du sejour pour les dommages', () => {
    const q = service.quote(500, InsuranceType.damage);
    expect(q.premiumAmount).toBe(15);
    expect(q.coverageAmount).toBe(1000);
  });

  it('arrondit au centime', () => {
    const q = service.quote(333.33, InsuranceType.theft);
    expect(q.premiumAmount).toBe(6.67);
  });
});
