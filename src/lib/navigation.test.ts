import { describe, expect, it } from 'vitest';
import { dragDelta, wheelDelta } from './navigation';

describe('wheelDelta', () => {
	it('scrolling down dives to smaller scales (negative)', () => {
		expect(wheelDelta(100)).toBeLessThan(0);
		expect(wheelDelta(-100)).toBeGreaterThan(0);
	});

	it('treats line and page modes as larger steps than pixels', () => {
		expect(Math.abs(wheelDelta(3, 1))).toBeGreaterThan(Math.abs(wheelDelta(3, 0)));
		expect(Math.abs(wheelDelta(1, 2))).toBeGreaterThan(Math.abs(wheelDelta(1, 1)));
	});

	it('caps huge trackpad flings', () => {
		expect(wheelDelta(100000)).toBe(-1.2);
	});
});

describe('dragDelta', () => {
	it('finger moving up (negative) dives to smaller scales, like scrolling down', () => {
		expect(dragDelta(-70)).toBeLessThan(0);
		expect(dragDelta(70)).toBeGreaterThan(0);
	});

	it('caps big swipes', () => {
		expect(dragDelta(-10000)).toBe(-1.2);
	});
});
