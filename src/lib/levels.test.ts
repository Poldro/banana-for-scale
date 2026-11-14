import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { credits, levels, levelsSchema, START_INDEX } from './levels';

describe('levels data', () => {
	it('starts from the banana', () => {
		expect(levels[START_INDEX].id).toBe('banana');
	});

	it('spans from the Planck length to the observable universe', () => {
		expect(levels[0].exp).toBeLessThan(-34);
		expect(levels[levels.length - 1].exp).toBeGreaterThan(26);
	});

	it('rejects unsorted levels', () => {
		const swapped = [levels[1], levels[0], ...levels.slice(2)];
		expect(levelsSchema.safeParse(swapped).success).toBe(false);
	});

	it('has a credit with an allowed license for every image level', () => {
		for (const level of levels) {
			if (level.visual.type !== 'image') continue;
			const credit = credits[level.id];
			expect(credit, `missing credit for ${level.id}`).toBeDefined();
			expect(existsSync(resolve('static', credit.file)), `missing file for ${level.id}`).toBe(true);
		}
	});

	it('has no orphan credits', () => {
		const imageIds = new Set(levels.filter((l) => l.visual.type === 'image').map((l) => l.id));
		for (const id of Object.keys(credits)) expect(imageIds.has(id), id).toBe(true);
	});
});
