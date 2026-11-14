import { describe, expect, it } from 'vitest';
import { MAX_RENDER_PX, renderPixels } from './size';

describe('renderPixels', () => {
	it('renders at the on-screen size, including device pixel ratio and padding', () => {
		expect(renderPixels(100, 1.1, 2)).toBe(440);
	});

	it('never exceeds the shared canvas', () => {
		expect(renderPixels(5000, 1, 2)).toBe(MAX_RENDER_PX);
	});

	it('honours a smaller canvas on low-power devices', () => {
		expect(renderPixels(5000, 1, 2, 640)).toBe(640);
	});

	it('returns 0 for specks too small to be worth a 3D render', () => {
		expect(renderPixels(1, 1, 1)).toBe(0);
	});
});
