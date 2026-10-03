import { describe, expect, it } from 'vitest';
import { computeDiscount } from './money';

describe('computeDiscount', () => {
  it('calcula desconto válido', () => expect(computeDiscount(100, 75)).toBe(25));
  it('não inventa desconto quando o preço anterior é menor', () => expect(computeDiscount(70, 80)).toBeNull());
  it('não calcula sem preço anterior', () => expect(computeDiscount(null, 80)).toBeNull());
});
