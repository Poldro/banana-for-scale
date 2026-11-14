type Rgb = readonly [number, number, number];

function parse(hex: string): Rgb {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
	return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Linear mix of two #rrggbb colours, t in [0, 1]. */
export function mixHex(a: string, b: string, t: number): string {
	const ca = parse(a);
	const cb = parse(b);
	const k = Math.min(Math.max(t, 0), 1);
	return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * k) as unknown as Rgb);
}

/** Relative luminance (WCAG), 0 = black, 1 = white. */
export function luminance(hex: string): number {
	const lin = parse(hex).map((c) => {
		const v = c / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
