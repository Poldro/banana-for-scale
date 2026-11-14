import { describe, expect, it } from 'vitest';
import { LENS_RADIUS, LENS_THRESHOLD, NEIGHBOUR_CLIP, horizon, settledness, smallerLayout } from './reference';

const desktop = { width: 1500, height: 760 };
const phone = { width: 390, height: 740 };
const desktopStage = { cx: 750, cy: 380, natural: 296 };
const phoneStage = { cx: 195, cy: 227, natural: 152 };

describe('settledness', () => {
	it('is 1 on a stop and 0 well between stops', () => {
		expect(settledness(4)).toBe(1);
		expect(settledness(4.02)).toBe(1);
		expect(settledness(4.5)).toBe(0);
		expect(settledness(3.7)).toBe(0);
		expect(settledness(4.15)).toBeGreaterThan(0);
		expect(settledness(4.15)).toBeLessThan(1);
	});
});

/** smallerLayout for cases that always fit. */
function layout(stage: typeof desktopStage, viewport: typeof desktop, radius: number) {
	const l = smallerLayout(stage, viewport, radius);
	if (!l) throw new Error('expected a layout');
	return l;
}

const outside = (stage: typeof desktopStage, p: { x: number; y: number }, radius: number) =>
	Math.hypot(p.x - stage.cx, p.y - stage.cy) - stage.natural - radius * NEIGHBOUR_CLIP;

describe('smallerLayout', () => {
	it('draws a visible neighbour at true scale beside the subject, without a lens', () => {
		const l = layout(desktopStage, desktop, 22);
		expect(l.lens).toBeNull();
		expect(l.anchor.x).toBeGreaterThan(desktopStage.cx);
		expect(l.anchor.y).toBeGreaterThan(desktopStage.cy);
	});

	it('adds a magnifier when the neighbour would be a speck', () => {
		const l = layout(desktopStage, desktop, LENS_THRESHOLD / 2);
		expect(l.lens).not.toBeNull();
	});

	it('keeps the lens on screen and clear of the ruler on a phone', () => {
		const { lens } = layout(phoneStage, phone, 0.001);
		expect(lens).not.toBeNull();
		if (!lens) return;
		expect(lens.x - LENS_RADIUS).toBeGreaterThanOrEqual(16);
		expect(lens.x + LENS_RADIUS).toBeLessThanOrEqual(phone.width - 64);
		expect(lens.y + LENS_RADIUS).toBeLessThanOrEqual(phone.height - 16);
	});

	it('puts the lens beside the speck on a phone, so it stays above the text panel', () => {
		const { anchor, lens } = layout(phoneStage, phone, 0.001);
		expect(lens?.y).toBe(anchor.y);
	});

	it('leaves captions to the text panel on a phone', () => {
		expect(layout(phoneStage, phone, 0.001).label).toBeNull();
		expect(layout(phoneStage, phone, 20).label).toBeNull();
		expect(layout(desktopStage, desktop, 20).label).not.toBeNull();
	});

	it('never draws the neighbour over the subject, even when the two are close in size', () => {
		// Red blood cell → E. coli: 10^0.58 apart, so the neighbour is a quarter the size.
		for (const [stage, viewport] of [
			[desktopStage, desktop],
			[phoneStage, phone]
		] as const) {
			const r = stage.natural * 10 ** -0.58;
			const l = smallerLayout(stage, viewport, r);
			if (l) expect(outside(stage, l.anchor, r)).toBeGreaterThanOrEqual(0);
		}
		expect(smallerLayout(desktopStage, desktop, desktopStage.natural * 10 ** -0.58)).not.toBeNull();
	});

	it('tries another direction when below-right is off screen', () => {
		const r = desktopStage.natural * 10 ** -0.58;
		const { anchor } = layout(desktopStage, desktop, r);
		const angle = Math.atan2(anchor.y - desktopStage.cy, anchor.x - desktopStage.cx);
		expect(Math.abs(angle - Math.PI / 4)).toBeGreaterThan(0.01);
		expect(anchor.y + r * NEIGHBOUR_CLIP).toBeLessThanOrEqual(desktop.height - 16);
	});

	it('hides a big neighbour on a phone, where the text panel names it instead', () => {
		expect(smallerLayout(phoneStage, phone, phoneStage.natural * 10 ** -0.58)).toBeNull();
	});

	it('gives up rather than overlap when nothing fits', () => {
		const cramped = { cx: 200, cy: 200, natural: 190 };
		expect(smallerLayout(cramped, { width: 400, height: 400 }, 80)).toBeNull();
	});
});

describe('horizon', () => {
	it('places the bigger neighbour as an arc just below the subject', () => {
		const h = horizon(desktopStage, 900);
		expect(h.cx).toBe(desktopStage.cx);
		expect(h.cy - h.radius).toBeGreaterThan(desktopStage.cy + desktopStage.natural);
		expect(h.cy - h.radius).toBeLessThan(desktopStage.cy + desktopStage.natural * 1.2);
	});

	it('flattens absurdly large radii to keep canvas maths stable', () => {
		const h = horizon(desktopStage, 1e12);
		expect(h.radius).toBeLessThanOrEqual(1e6);
	});
});
