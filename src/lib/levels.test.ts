import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	assetCreditSchema,
	credits,
	levels,
	levelsSchema,
	MODEL_ASSETS,
	MODEL_KINDS,
	modelCredits,
	START_INDEX
} from './levels';

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

describe('3D models', () => {
	it('models every stop except those better shown as a picture', () => {
		const withoutModel = levels.filter((l) => !l.model).map((l) => l.id);
		expect(withoutModel).toEqual([
			'desert',
			'quarks',
			'tardigrade',
			'bee',
			'human',
			'whale',
			'hurricane',
			'orion-nebula'
		]);
	});

	it('uses each model kind at most once', () => {
		const kinds = levels.flatMap((l) => (l.model ? [l.model.kind] : []));
		expect(new Set(kinds).size).toBe(kinds.length);
	});

	it('keeps a 2D visual on every modelled level as a fallback', () => {
		for (const level of levels.filter((l) => l.model)) expect(level.visual).toBeDefined();
	});

	it('has a credited, existing file for every asset a model uses', () => {
		for (const kind of MODEL_KINDS) {
			for (const asset of MODEL_ASSETS[kind]) {
				const credit = modelCredits[asset];
				expect(credit, `missing credit for ${asset}`).toBeDefined();
				expect(existsSync(resolve('static', credit.file)), `missing file for ${asset}`).toBe(true);
			}
		}
	});

	it('has no orphan model credits', () => {
		const used = new Set(MODEL_KINDS.flatMap((k) => MODEL_ASSETS[k]));
		for (const id of Object.keys(modelCredits)) expect(used.has(id), id).toBe(true);
	});

	it('rejects a model credit with a non-free license', () => {
		const bad = { file: 'models/x.glb', author: 'A', license: 'All rights reserved', source: 'https://x.org' };
		expect(assetCreditSchema.safeParse(bad).success).toBe(false);
	});
});
