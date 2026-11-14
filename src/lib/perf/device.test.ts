import { describe, expect, it } from 'vitest';
import { deviceProfile } from './device';

describe('deviceProfile', () => {
	it('treats touch devices as low power', () => {
		const p = deviceProfile({ coarsePointer: true, shortSide: 1200 });
		expect(p.lowPower).toBe(true);
		expect(p.maxRenderPx).toBeLessThan(1024);
		expect(p.detail).toBeLessThan(1);
	});

	it('treats small screens as low power', () => {
		expect(deviceProfile({ coarsePointer: false, shortSide: 390 }).lowPower).toBe(true);
	});

	it('keeps full quality on desktops', () => {
		const p = deviceProfile({ coarsePointer: false, shortSide: 1080 });
		expect(p).toMatchObject({ lowPower: false, maxRenderPx: 1024, detail: 1 });
	});

	it('never preloads more models than it can keep', () => {
		for (const coarsePointer of [true, false]) {
			const p = deviceProfile({ coarsePointer, shortSide: 800 });
			expect(2 * p.modelPreload + 1).toBeLessThan(p.sceneCache);
		}
	});

	it('caches fewer scenes on low-power devices', () => {
		const low = deviceProfile({ coarsePointer: true, shortSide: 390 });
		const high = deviceProfile({ coarsePointer: false, shortSide: 1080 });
		expect(low.sceneCache).toBeLessThan(high.sceneCache);
	});
});
