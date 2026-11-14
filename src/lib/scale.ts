/**
 * Pure scale maths.
 *
 * The viewer's state is a continuous *position* p in [0, n-1] over the
 * ordered list of levels. Each integer position is one level; between two
 * levels the size exponent (log10 of metres) is interpolated linearly, so
 * every level costs the same amount of scrolling even when the gap between
 * them spans many orders of magnitude (e.g. atom → nucleus).
 */

export const BANANA_METERS = 0.2;

const METERS_PER_AU = 1.495978707e11;
const METERS_PER_LY = 9.4607e15;

export function clampPosition(p: number, count: number): number {
	return Math.min(Math.max(p, 0), count - 1);
}

export function nearestIndex(p: number, count: number): number {
	return Math.round(clampPosition(p, count));
}

/** Size exponent (log10 m) shown at continuous position p. */
export function exponentAt(exps: readonly number[], p: number): number {
	const clamped = clampPosition(p, exps.length);
	const i = Math.min(Math.floor(clamped), exps.length - 2);
	if (i < 0) return exps[0];
	const t = clamped - i;
	if (t === 0) return exps[i];
	if (t === 1) return exps[i + 1];
	return exps[i] + t * (exps[i + 1] - exps[i]);
}

/** Inverse of exponentAt (exps must be ascending). */
export function positionOfExponent(exps: readonly number[], e: number): number {
	if (e <= exps[0]) return 0;
	const last = exps.length - 1;
	if (e >= exps[last]) return last;
	const i = exps.findIndex((x, k) => e >= x && e <= exps[k + 1]);
	return i + (e - exps[i]) / (exps[i + 1] - exps[i]);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
	return t * t * (3 - 2 * t);
}

/**
 * Opacity of a layer given its log-scale relative to the viewport
 * (s = levelExp - currentExp; 0 means "natural size", 1 means 10x too big).
 * Layers fade in while growing from ~16% to ~50% of natural size and fade
 * out as they grow past ~1.4x (gone by 4x), so neighbours cross-fade without clutter.
 */
export function layerAlpha(s: number): number {
	if (s >= 0) return 1 - smoothstep(0.15, 0.6, s);
	return smoothstep(-0.8, -0.3, s);
}

const SUPERSCRIPTS: Record<string, string> = {
	'-': '⁻',
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹'
};

export function superscript(n: number): string {
	return String(n)
		.split('')
		.map((c) => SUPERSCRIPTS[c] ?? c)
		.join('');
}

/** Up to 3 significant figures, trailing zeros dropped. */
function sig(x: number): string {
	return String(Number(x.toPrecision(3)));
}

/** "4.4 × 10²⁷" or "10⁻¹⁸" for an exponent. */
export function scientific(e: number, digits = 2): string {
	const whole = Math.floor(e + 1e-9);
	const mantissa = Number(Math.pow(10, e - whole).toPrecision(digits));
	// Rounding may push the mantissa to 10.
	if (mantissa >= 10) return scientific(whole + 1, digits);
	const power = `10${superscript(whole)}`;
	return mantissa === 1 ? power : `${mantissa} × ${power}`;
}

const SMALL_UNITS: ReadonlyArray<[number, string]> = [
	[1e-15, 'fm'],
	[1e-12, 'pm'],
	[1e-9, 'nm'],
	[1e-6, 'µm'],
	[1e-3, 'mm'],
	[1e-2, 'cm']
];

const SCALE_WORDS: ReadonlyArray<[number, string]> = [
	[1e9, 'billion'],
	[1e6, 'million']
];

function bigNumber(x: number): string {
	const word = SCALE_WORDS.find(([v]) => x >= v && x < v * 1000);
	if (word) return `${sig(x / word[0])} ${word[1]}`;
	return Number(sig(x)).toLocaleString('en-US');
}

/** Human-friendly length for a size exponent (log10 m). */
export function formatLength(e: number): string {
	const m = Math.pow(10, e);
	if (m < 1e-15 * 0.95) return `${scientific(e)} m`;
	if (m < 1) {
		const unit = [...SMALL_UNITS].reverse().find(([v]) => m >= v * 0.95) ?? SMALL_UNITS[0];
		return `${sig(m / unit[0])} ${unit[1]}`;
	}
	if (m < 1e3) return `${sig(m)} m`;
	if (m < 0.1 * METERS_PER_AU) return `${bigNumber(m / 1e3)} km`;
	if (m < 0.1 * METERS_PER_LY) return `${bigNumber(m / METERS_PER_AU)} AU`;
	const ly = m / METERS_PER_LY;
	if (ly < 1e12) return `${bigNumber(ly)} light-year${ly === 1 ? '' : 's'}`;
	return `${scientific(e)} m`;
}

/** A ratio ≥ 1 as words: "8.7", "13", "1,300", "26 million", "10¹³". */
function ratioWords(ratioExp: number): string {
	const r = Math.pow(10, ratioExp);
	if (r < 10) return String(Number(r.toFixed(1)));
	if (r < 100) return String(Math.round(r));
	if (r < 1e12) return bigNumber(Number(r.toPrecision(2)));
	return scientific(ratioExp);
}

/** "≈ 9 bananas end to end" / "≈ 13 fit along one banana". */
export function bananaComparison(e: number): string {
	const ratioExp = e - Math.log10(BANANA_METERS);
	if (Math.abs(ratioExp) < 0.05) return '1 banana';
	const r = Math.pow(10, Math.abs(ratioExp));
	const count = r < 10 ? String(Math.round(r)) : ratioWords(Math.abs(ratioExp));
	return ratioExp > 0 ? `≈ ${count} bananas end to end` : `≈ ${count} fit along one banana`;
}

/** How the stop at `toExp` compares with the one at `fromExp`: "13 times smaller". */
export function sizeRatio(fromExp: number, toExp: number): string {
	const d = toExp - fromExp;
	return `${ratioWords(Math.abs(d))} times ${d > 0 ? 'bigger' : 'smaller'}`;
}
