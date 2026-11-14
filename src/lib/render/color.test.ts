import { describe, expect, it } from 'vitest';
import { luminance, mixHex } from './color';

describe('mixHex', () => {
	it('returns the endpoints at t = 0 and t = 1', () => {
		expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
		expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
	});

	it('mixes channels linearly and clamps t', () => {
		expect(mixHex('#000000', '#ff8000', 0.5)).toBe('#804000');
		expect(mixHex('#102030', '#405060', 2)).toBe('#405060');
	});
});

describe('luminance', () => {
	it('is 0 for black and 1 for white', () => {
		expect(luminance('#000000')).toBe(0);
		expect(luminance('#ffffff')).toBeCloseTo(1);
	});

	it('treats the banana background as light and space as dark', () => {
		expect(luminance('#f3ead2')).toBeGreaterThan(0.5);
		expect(luminance('#05070d')).toBeLessThan(0.05);
	});
});
