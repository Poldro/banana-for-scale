import { describe, expect, it } from 'vitest';
import { dominantAxis, dragDelta, gestureGoal, settleTarget, spinDelta, wheelDelta } from './navigation';

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

describe('spinDelta', () => {
	it('turns a sideways drag into a rotation, dragging right turns right', () => {
		expect(spinDelta(100)).toBeCloseTo(1);
		expect(spinDelta(-50)).toBeCloseTo(-0.5);
	});

	it('caps wild flicks', () => {
		expect(spinDelta(1e5)).toBe(Math.PI / 2);
	});
});

describe('dominantAxis', () => {
	it('picks the axis with clearly more movement', () => {
		expect(dominantAxis(30, 4)).toBe('x');
		expect(dominantAxis(2, -40)).toBe('y');
	});

	it('treats diagonal moves as vertical, so zoom wins over rotation', () => {
		expect(dominantAxis(20, 18)).toBe('y');
	});
});

describe('gestureGoal', () => {
	it('lets one gesture travel at most one stop from where it began', () => {
		expect(gestureGoal(10, 13.4, 34)).toBe(11);
		expect(gestureGoal(10, 7, 34)).toBe(9);
		expect(gestureGoal(10, 10.6, 34)).toBeCloseTo(10.6);
	});

	it('stays inside the scale', () => {
		expect(gestureGoal(0, -0.8, 34)).toBe(0);
		expect(gestureGoal(33, 34, 34)).toBe(33);
	});
});

describe('settleTarget', () => {
	it('moves exactly one stop once the gesture travels far enough', () => {
		expect(settleTarget(10, 10.25, 34)).toBe(11);
		expect(settleTarget(10, 11, 34)).toBe(11);
		expect(settleTarget(10, 9.7, 34)).toBe(9);
	});

	it('springs back home after a tiny nudge', () => {
		expect(settleTarget(10, 10.1, 34)).toBe(10);
		expect(settleTarget(10, 9.95, 34)).toBe(10);
	});

	it('never leaves the scale', () => {
		expect(settleTarget(0, -0.5, 34)).toBe(0);
		expect(settleTarget(33, 33.5, 34)).toBe(33);
	});
});
