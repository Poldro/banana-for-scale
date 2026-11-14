/**
 * Shared helpers for fetching media and license metadata from Wikimedia
 * Commons. Every caller must reject files whose license is not allowed.
 */
export const USER_AGENT = 'BananaForScale/0.1 (open-source educational project; image license lookup)';
export const ALLOWED_LICENSE = /^(Public domain|CC0|CC BY(-SA)? \d\.\d)$/;
export const THROTTLE_MS = 1500;

const API = 'https://commons.wikimedia.org/w/api.php';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons metadata fields are HTML; keep plain text only. */
export function plainText(html = '') {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export async function fetchWithRetry(url, attempts = 4) {
	for (let i = 1; i <= attempts; i++) {
		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		if (res.ok && !(res.headers.get('content-type') ?? '').startsWith('text/html')) return res;
		if (i === attempts) throw new Error(`HTTP ${res.status} for ${url}`);
		await sleep(THROTTLE_MS * 2 ** i);
	}
}

/** Image info (thumbnail URL + extmetadata) for a Commons file, scaled to `width`. */
export async function imageInfo(title, width) {
	const url = new URL(API);
	const params = {
		action: 'query',
		format: 'json',
		titles: `File:${title}`,
		prop: 'imageinfo',
		iiprop: 'url|extmetadata',
		iiurlwidth: String(width),
		iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Credit'
	};
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const json = await (await fetchWithRetry(url)).json();
	const page = Object.values(json.query?.pages ?? {})[0];
	const info = page?.imageinfo?.[0];
	if (!info) throw new Error(`Commons file not found: ${title}`);
	return info;
}

/**
 * Downloads a Commons file at `width` and returns its bytes with a vetted
 * credit. Throws if the license is not allowed or no author is given.
 */
export async function fetchCommons(title, width) {
	const info = await imageInfo(title, width);
	const meta = info.extmetadata ?? {};
	const license = plainText(meta.LicenseShortName?.value);
	if (!ALLOWED_LICENSE.test(license)) throw new Error(`${title}: license "${license}" is not allowed`);
	const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value);
	if (!author) throw new Error(`${title}: no author/credit in Commons metadata`);
	await sleep(THROTTLE_MS);
	const bytes = Buffer.from(await (await fetchWithRetry(info.thumburl ?? info.url)).arrayBuffer());
	const licenseUrl = meta.LicenseUrl?.value;
	return {
		bytes,
		credit: {
			author: author.slice(0, 200),
			license,
			...(licenseUrl ? { licenseUrl } : {}),
			source: info.descriptionurl
		}
	};
}
