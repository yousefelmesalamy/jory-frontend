import { PricePipe } from './price.pipe';

describe('PricePipe', () => {
  const pipe = new PricePipe();

  it('drops decimals that are all zeros', () => {
    expect(pipe.transform('340.00')).toBe('340');
    expect(pipe.transform('0.00')).toBe('0');
    expect(pipe.transform(340)).toBe('340');
  });

  it('keeps decimals that carry a value', () => {
    expect(pipe.transform('12.50')).toBe('12.50');
    expect(pipe.transform('12.05')).toBe('12.05');
    expect(pipe.transform(12.5)).toBe('12.5');
  });

  it('handles negatives the same way', () => {
    expect(pipe.transform('-15.00')).toBe('-15');
    expect(pipe.transform('-15.75')).toBe('-15.75');
  });

  it('returns an empty string for a missing amount', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('passes through anything that is not a plain number', () => {
    expect(pipe.transform('340.00 - 420.00')).toBe('340.00 - 420.00');
    expect(pipe.transform('Free')).toBe('Free');
  });
});
