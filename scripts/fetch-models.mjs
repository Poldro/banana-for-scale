#!/usr/bin/env node
/**
 * Builds the 3D assets in static/models and static/textures and writes their
 * attribution to src/lib/data/model-credits.json.
 *
 * - Models come from Poly Haven (all assets CC0); we keep a single mesh,
 *   shrink its textures to WebP and save a binary glTF.
 * - NASA models and maps are public domain and fetched from NASA directly.
 * - Other textures come from Wikimedia Commons through the same license
 *   allow-list as the photos.
 * - The Everest heightmap is cut from Mapzen terrain tiles (SRTM) on AWS.
 *
 * Usage: npm run models            (skips assets already built)
 *        npm run models -- --force (rebuilds everything)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { fetchCommons, fetchWithRetry, sleep, THROTTLE_MS } from './lib/commons.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CREDITS = resolve(ROOT, 'src/lib/data/model-credits.json');
const CACHE = resolve(ROOT, 'scripts/.cache/polyhaven');
const POLYHAVEN_API = 'https://api.polyhaven.com';
const CC0 = {
	license: 'CC0',
	licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
};
const TEXTURE_SIZE = 1024;

/** Poly Haven glTF assets: keep only `node` from the asset at `resolution`. */
const MODELS = [{ id: 'banana', asset: 'bananas', node: 'bananas_d', resolution: '1k' }];

/** Binary glTF files downloaded as-is, then compacted. */
const DIRECT_MODELS = [
	{
		id: 'saturn-v',
		url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Saturn%20V/Saturn%20V.glb',
		credit: {
			author: 'NASA 3D Resources',
			license: 'Public domain',
			source: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Saturn%20V'
		}
	}
];

/** Equirectangular textures from Wikimedia Commons. */
const TEXTURES = [
	{ id: 'earth', commons: 'Land shallow topo 2048.jpg', width: 2048 },
	{
		id: 'jupiter',
		commons: 'Jupiter Cylindrical Map - Dec 2000 PIA07782.jpg',
		width: 2048
	}
];

const SVS_MOON = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720';
const MOON_CREDIT = {
	author: "NASA's Scientific Visualization Studio (LRO data)",
	license: 'Public domain',
	source: 'https://svs.gsfc.nasa.gov/4720'
};

/** Equirectangular maps downloaded from a public-domain source. */
const DIRECT_TEXTURES = [
	{
		id: 'moon',
		url: `${SVS_MOON}/lroc_color_poles_2k.tif`,
		width: 2048,
		credit: MOON_CREDIT
	},
	{
		id: 'moon-relief',
		url: `${SVS_MOON}/ldem_3_8bit.jpg`,
		width: 1024,
		grey: true,
		credit: MOON_CREDIT
	},
	{
		id: 'cmb',
		url: 'https://www.astropix.org/archive/planck/planck13-002a/planck_planck13-002a_3000.jpg',
		width: 1536,
		// Fine noise compresses poorly; this keeps the file near 400 KB.
		quality: 68,
		// Sky maps are drawn as seen from inside; flip to wrap the outside of a sphere.
		flip: true,
		credit: {
			author: 'ESA and the Planck Collaboration',
			license: 'Public domain',
			source: 'https://www.astropix.org/image/planck/planck13-002a'
		}
	}
];

/** Terrain around the summit of Everest, as a heightmap. */
const EVEREST = { lat: 27.98806, lon: 86.92528, zoom: 12, size: 288 };
/** Grey levels 0–255 map linearly to these elevations, in metres. */
const EVEREST_RANGE = [3000, 8900];

const force = process.argv.includes('--force');

async function json(url) {
	return (await fetchWithRetry(url)).json();
}

async function download(url, target) {
	if (existsSync(target)) return;
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, Buffer.from(await (await fetchWithRetry(url)).arrayBuffer()));
}

async function buildModel({ id, asset, node, resolution }) {
	const file = `models/${id}.glb`;
	const target = resolve(ROOT, 'static', file);

	const info = await json(`${POLYHAVEN_API}/info/${asset}`);
	const author = Object.keys(info.authors ?? {}).join(', ');
	if (!author) throw new Error(`${asset}: no author on Poly Haven`);
	const credit = {
		file,
		author: `${author} / Poly Haven`,
		...CC0,
		source: `https://polyhaven.com/a/${asset}`
	};
	if (!force && existsSync(target)) return credit;

	const files = await json(`${POLYHAVEN_API}/files/${asset}`);
	const gltf = files.gltf?.[resolution]?.gltf;
	if (!gltf) throw new Error(`${asset}: no ${resolution} glTF`);
	const dir = resolve(CACHE, `${asset}_${resolution}`);
	const main = resolve(dir, `${asset}.gltf`);
	await download(gltf.url, main);
	for (const [path, inc] of Object.entries(gltf.include ?? {})) {
		await download(inc.url, resolve(dir, path));
	}

	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
	const doc = await io.read(main);
	const nodes = doc.getRoot().listNodes();
	if (!nodes.some((n) => n.getName() === node)) throw new Error(`${asset}: node ${node} not found`);
	for (const n of nodes) if (n.getName() !== node) n.dispose();
	await doc.transform(
		prune(),
		dedup(),
		textureCompress({
			encoder: sharp,
			targetFormat: 'webp',
			resize: [TEXTURE_SIZE, TEXTURE_SIZE],
			quality: 80
		})
	);
	mkdirSync(dirname(target), { recursive: true });
	await io.write(target, doc);
	return credit;
}

async function buildDirectModel({ id, url, credit }) {
	const file = `models/${id}.glb`;
	const target = resolve(ROOT, 'static', file);
	const result = { file, ...credit };
	if (!force && existsSync(target)) return result;
	const source = resolve(CACHE, '..', 'direct', `${id}.glb`);
	await download(url, source);
	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
	const doc = await io.read(source);
	await doc.transform(
		prune(),
		dedup(),
		textureCompress({
			encoder: sharp,
			targetFormat: 'webp',
			resize: [TEXTURE_SIZE, TEXTURE_SIZE],
			quality: 80
		})
	);
	mkdirSync(dirname(target), { recursive: true });
	await io.write(target, doc);
	return result;
}

async function writeWebp(file, image, quality = 82) {
	const target = resolve(ROOT, 'static', file);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, await image.webp({ quality }).toBuffer());
}

async function buildDirectTexture({ id, url, width, grey, flip, quality, credit }) {
	const file = `textures/${id}.webp`;
	const result = { file, ...credit };
	if (!force && existsSync(resolve(ROOT, 'static', file))) return result;
	const source = resolve(CACHE, '..', 'direct', `${id}${url.slice(url.lastIndexOf('.'))}`);
	await download(url, source);
	let image = sharp(source, { limitInputPixels: false }).resize(width, width / 2, { fit: 'fill' });
	if (flip) image = image.flop();
	if (grey) image = image.greyscale();
	await writeWebp(file, image, quality ?? (grey ? 90 : 82));
	return result;
}

/** Web Mercator tile coordinates (fractional) of a point. */
function tileOf(lat, lon, zoom) {
	const n = 2 ** zoom;
	const rad = (lat * Math.PI) / 180;
	return {
		x: ((lon + 180) / 360) * n,
		y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
	};
}

async function buildEverest() {
	const file = 'textures/everest.webp';
	const credit = {
		file,
		author: 'Mapzen Terrain Tiles (SRTM, NASA/USGS)',
		license: 'Public domain',
		source: 'https://registry.opendata.aws/terrain-tiles/'
	};
	if (!force && existsSync(resolve(ROOT, 'static', file))) return credit;
	const { lat, lon, zoom, size } = EVEREST;
	const centre = tileOf(lat, lon, zoom);
	const half = size / 2 / 256;
	const [x0, x1] = [Math.floor(centre.x - half), Math.floor(centre.x + half)];
	const [y0, y1] = [Math.floor(centre.y - half), Math.floor(centre.y + half)];
	const cols = x1 - x0 + 1;
	const rows = y1 - y0 + 1;
	const mosaic = new Float32Array(cols * 256 * rows * 256);
	for (let ty = y0; ty <= y1; ty++) {
		for (let tx = x0; tx <= x1; tx++) {
			const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${tx}/${ty}.png`;
			const png = Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());
			const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
			for (let py = 0; py < 256; py++) {
				for (let px = 0; px < 256; px++) {
					const i = (py * 256 + px) * 3;
					const metres = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
					const mx = (tx - x0) * 256 + px;
					const my = (ty - y0) * 256 + py;
					mosaic[my * cols * 256 + mx] = metres;
				}
			}
		}
	}
	const left = Math.round((centre.x - x0) * 256 - size / 2);
	const top = Math.round((centre.y - y0) * 256 - size / 2);
	const [low, high] = EVEREST_RANGE;
	const grey = Buffer.alloc(size * size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const metres = mosaic[(top + y) * cols * 256 + left + x];
			grey[y * size + x] = Math.round(Math.min(1, Math.max(0, (metres - low) / (high - low))) * 255);
		}
	}
	await writeWebp(file, sharp(grey, { raw: { width: size, height: size, channels: 1 } }), 100);
	return credit;
}

async function buildTexture({ id, commons, width }, previous) {
	const file = `textures/${id}.webp`;
	const target = resolve(ROOT, 'static', file);
	if (!force && previous && existsSync(target)) return previous;
	const { bytes, credit } = await fetchCommons(commons, width);
	const data = await sharp(bytes)
		.resize(width, width / 2, { fit: 'fill' })
		.webp({ quality: 82 })
		.toBuffer();
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, data);
	return { file, ...credit };
}

async function main() {
	const previous = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
	const credits = {};
	const failures = [];
	const run = async (id, job) => {
		try {
			credits[id] = await job();
			process.stdout.write(`✓ ${id} (${credits[id].license})\n`);
		} catch (err) {
			failures.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	for (const model of MODELS) await run(model.id, () => buildModel(model));
	for (const model of DIRECT_MODELS) await run(model.id, () => buildDirectModel(model));
	for (const texture of DIRECT_TEXTURES) {
		const id = texture.id.endsWith('-relief') ? texture.id : `${texture.id}-texture`;
		await run(id, () => buildDirectTexture(texture));
	}
	await run('everest', buildEverest);
	for (const texture of TEXTURES) {
		await run(`${texture.id}-texture`, () => buildTexture(texture, previous[`${texture.id}-texture`]));
		await sleep(THROTTLE_MS);
	}

	writeFileSync(CREDITS, `${JSON.stringify(credits, null, '\t')}\n`);
	if (failures.length) {
		process.stderr.write(`\n${failures.length} asset(s) failed:\n${failures.join('\n')}\n`);
		process.exit(1);
	}
}

main().catch((err) => {
	process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
	process.exit(1);
});
