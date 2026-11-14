#!/usr/bin/env node
/**
 * Downloads every image referenced in src/lib/data/levels.json from
 * Wikimedia Commons, converts it to WebP in static/img/, and writes the
 * attribution metadata (author, license, source) to src/lib/data/credits.json.
 *
 * Fails if a file's license is not in the allow-list, so nothing with an
 * unclear license can slip into the public repo.
 *
 * Usage: npm run images            (skips images already downloaded)
 *        npm run images -- --force (re-downloads everything)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fetchCommons, sleep, THROTTLE_MS } from './lib/commons.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const LEVELS = resolve(ROOT, 'src/lib/data/levels.json');
const CREDITS = resolve(ROOT, 'src/lib/data/credits.json');
const OUT_DIR = resolve(ROOT, 'static/img');
const MAX_SIDE = 1600;

const force = process.argv.includes('--force');

/** Trims fractional margins (e.g. scale bars or captions) from an image. */
async function cropped(image, crop) {
	if (!crop) return image;
	const { width, height } = await image.metadata();
	const left = Math.round(width * crop.left);
	const top = Math.round(height * crop.top);
	return sharp(await image.toBuffer()).extract({
		left,
		top,
		width: Math.round(width * (1 - crop.left - crop.right)),
		height: Math.round(height * (1 - crop.top - crop.bottom))
	});
}

async function processLevel(level, previous) {
	const file = `img/${level.id}.webp`;
	const target = resolve(OUT_DIR, `${level.id}.webp`);
	if (!force && previous && existsSync(target)) return previous;

	const { bytes, credit } = await fetchCommons(level.visual.commons, MAX_SIDE);
	const { data, info: out } = await (await cropped(sharp(bytes), level.visual.crop))
		.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer({ resolveWithObject: true });
	writeFileSync(target, data);
	return { file, width: out.width, height: out.height, ...credit };
}

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });
	const levels = JSON.parse(readFileSync(LEVELS, 'utf8'));
	const previous = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
	const credits = {};
	const failures = [];

	for (const level of levels.filter((l) => l.visual.type === 'image')) {
		try {
			credits[level.id] = await processLevel(level, previous[level.id]);
			process.stdout.write(`✓ ${level.id} (${credits[level.id].license})\n`);
			await sleep(THROTTLE_MS);
		} catch (err) {
			failures.push(`${level.id}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	writeFileSync(CREDITS, `${JSON.stringify(credits, null, '\t')}\n`);
	if (failures.length) {
		process.stderr.write(`\n${failures.length} image(s) failed:\n${failures.join('\n')}\n`);
		process.exit(1);
	}
}

main().catch((err) => {
	process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
	process.exit(1);
});
