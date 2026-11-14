import { describe, expect, it } from 'vitest';
import {
	BANANA_METERS,
	bananaComparison,
	clampPosition,
	exponentAt,
	formatLength,
	layerAlpha,
	nearestIndex,
	positionOfExponent,
	sizeRatio
} from './scale';

const exps = [-34.8, -14.1, -9.35, -0.7, 7.1, 26.94];

describe('exponentAt', () => {
	it('returns the level exponent at integer positions', () => {
		expect(exponentAt(exps, 0)).toBe(-34.8);
		expect(exponentAt(exps, 3)).toBe(-0.7);
		expect(exponentAt(exps, 5)).toBe(26.94);
	});

	it('interpolates linearly between neighbouring levels', () => {
		expect(exponentAt(exps, 3.5)).toBeCloseTo((-0.7 + 7.1) / 2);
		expect(exponentAt(exps, 0.25)).toBeCloseTo(-34.8 + 0.25 * (-14.1 + 34.8));
	});

	it('clamps outside the range', () => {
		expect(exponentAt(exps, -3)).toBe(-34.8);
		expect(exponentAt(exps, 99)).toBe(26.94);
	});
});

describe('positionOfExponent', () => {
	it('is the inverse of exponentAt', () => {
		for (const p of [0, 0.3, 2.7, 4.99, 5]) {
			expect(positionOfExponent(exps, exponentAt(exps, p))).toBeCloseTo(p);
		}
	});

	it('clamps outside the range', () => {
		expect(positionOfExponent(exps, -50)).toBe(0);
		expect(positionOfExponent(exps, 50)).toBe(5);
	});
});

describe('clampPosition', () => {
	it('keeps the position inside [0, n-1]', () => {
		expect(clampPosition(-1, 6)).toBe(0);
		expect(clampPosition(7.2, 6)).toBe(5);
		expect(clampPosition(2.4, 6)).toBe(2.4);
	});
});

describe('nearestIndex', () => {
	it('rounds the continuous position', () => {
		expect(nearestIndex(2.49, 6)).toBe(2);
		expect(nearestIndex(2.5, 6)).toBe(3);
		expect(nearestIndex(-0.4, 6)).toBe(0);
		expect(nearestIndex(9, 6)).toBe(5);
	});
});

describe('layerAlpha', () => {
	it('is fully opaque when the layer is at its natural size', () => {
		expect(layerAlpha(0)).toBe(1);
	});

	it('fades out once the layer has grown about 4x', () => {
		expect(layerAlpha(0.6)).toBe(0);
		expect(layerAlpha(1)).toBe(0);
		expect(layerAlpha(0.35)).toBeGreaterThan(0);
		expect(layerAlpha(0.35)).toBeLessThan(1);
	});

	it('is invisible while far too small, then fades in', () => {
		expect(layerAlpha(-0.8)).toBe(0);
		expect(layerAlpha(-2)).toBe(0);
		expect(layerAlpha(-0.3)).toBe(1);
		expect(layerAlpha(-0.55)).toBeGreaterThan(0);
	});
});

describe('formatLength', () => {
	it('uses everyday units around human scale', () => {
		expect(formatLength(Math.log10(0.2))).toBe('20 cm');
		expect(formatLength(Math.log10(1.75))).toBe('1.75 m');
		expect(formatLength(Math.log10(828))).toBe('828 m');
		expect(formatLength(Math.log10(8849))).toBe('8.85 km');
		expect(formatLength(Math.log10(1.27e7))).toBe('12,700 km');
		expect(formatLength(Math.log10(1.39e9))).toBe('1.39 million km');
	});

	it('uses SI prefixes in the micro world', () => {
		expect(formatLength(-3.3)).toBe('501 µm');
		expect(formatLength(Math.log10(8e-6))).toBe('8 µm');
		expect(formatLength(-7)).toBe('100 nm');
		expect(formatLength(Math.log10(1.7e-15))).toBe('1.7 fm');
	});

	it('uses astronomical units and light-years in the macro world', () => {
		expect(formatLength(Math.log10(2.99e11))).toBe('2 AU');
		expect(formatLength(Math.log10(9.4607e15 * 24))).toBe('24 light-years');
		expect(formatLength(Math.log10(9.4607e15 * 1344))).toBe('1,340 light-years');
		expect(formatLength(Math.log10(9.4607e15 * 93e9))).toBe('93 billion light-years');
	});

	it('falls back to powers of ten beyond named units', () => {
		expect(formatLength(-18)).toBe('10⁻¹⁸ m');
		expect(formatLength(-34.8)).toBe('1.6 × 10⁻³⁵ m');
	});
});

describe('bananaComparison', () => {
	it('is one banana at banana scale', () => {
		expect(bananaComparison(Math.log10(BANANA_METERS))).toBe('1 banana');
	});

	it('counts bananas end to end for big things', () => {
		expect(bananaComparison(Math.log10(1.75))).toBe('≈ 9 bananas end to end');
		expect(bananaComparison(Math.log10(1.27e7))).toBe('≈ 64 million bananas end to end');
		expect(bananaComparison(26.94)).toBe('≈ 4.4 × 10²⁷ bananas end to end');
	});

	it('says how many fit in a banana for small things', () => {
		expect(bananaComparison(Math.log10(0.015))).toBe('≈ 13 fit along one banana');
		expect(bananaComparison(-34.8)).toBe('≈ 1.3 × 10³⁴ fit along one banana');
	});
});

describe('sizeRatio', () => {
	it('says how much smaller the next stop down is', () => {
		expect(sizeRatio(-0.7, -1.82)).toBe('13 times smaller');
	});

	it('keeps one decimal below ten', () => {
		expect(sizeRatio(-0.7, 0.24)).toBe('8.7 times bigger');
		expect(sizeRatio(0, Math.log10(1.4))).toBe('1.4 times bigger');
	});

	it('groups digits, then uses words, then powers of ten', () => {
		expect(sizeRatio(0, Math.log10(1340))).toBe('1,300 times bigger');
		expect(sizeRatio(0, Math.log10(2.6e7))).toBe('26 million times bigger');
		expect(sizeRatio(-26, -34.79)).toBe('620 million times smaller');
		expect(sizeRatio(0, 13)).toBe('10¹³ times bigger');
	});
});
