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

const ROOT = resolve(import.meta.dirname, '..');
const LEVELS = resolve(ROOT, 'src/lib/data/levels.json');
const CREDITS = resolve(ROOT, 'src/lib/data/credits.json');
const OUT_DIR = resolve(ROOT, 'static/img');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'BananaForScale/0.1 (open-source educational project; image license lookup)';
const MAX_SIDE = 1600;
const THROTTLE_MS = 1500;
const ALLOWED_LICENSE = /^(Public domain|CC0|CC BY(-SA)? \d\.\d)$/;

const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons metadata fields are HTML; keep plain text only. */
function plainText(html = '') {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchWithRetry(url, attempts = 4) {
	for (let i = 1; i <= attempts; i++) {
		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		if (res.ok && !(res.headers.get('content-type') ?? '').startsWith('text/html')) return res;
		if (i === attempts) throw new Error(`HTTP ${res.status} for ${url}`);
		await sleep(THROTTLE_MS * 2 ** i);
	}
}

async function imageInfo(title) {
	const url = new URL(API);
	const params = {
		action: 'query',
		format: 'json',
		titles: `File:${title}`,
		prop: 'imageinfo',
		iiprop: 'url|extmetadata',
		iiurlwidth: String(MAX_SIDE),
		iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Credit'
	};
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const json = await (await fetchWithRetry(url)).json();
	const page = Object.values(json.query?.pages ?? {})[0];
	const info = page?.imageinfo?.[0];
	if (!info) throw new Error(`Commons file not found: ${title}`);
	return info;
}

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

	const info = await imageInfo(level.visual.commons);
	const meta = info.extmetadata ?? {};
	const license = plainText(meta.LicenseShortName?.value);
	if (!ALLOWED_LICENSE.test(license)) {
		throw new Error(`${level.id}: license "${license}" is not allowed`);
	}
	const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value);
	if (!author) throw new Error(`${level.id}: no author/credit in Commons metadata`);

	await sleep(THROTTLE_MS);
	const bytes = Buffer.from(await (await fetchWithRetry(info.thumburl ?? info.url)).arrayBuffer());
	const { data, info: out } = await (await cropped(sharp(bytes), level.visual.crop))
		.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer({ resolveWithObject: true });
	writeFileSync(target, data);

	const licenseUrl = meta.LicenseUrl?.value;
	return {
		file,
		width: out.width,
		height: out.height,
		author: author.slice(0, 200),
		license,
		...(licenseUrl ? { licenseUrl } : {}),
		source: info.descriptionurl
	};
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
