/**
 * Layout for the scale references drawn around the current stop: the next
 * smaller stop at true scale beside the subject (with a magnifier when it
 * would be a speck) and the next bigger stop as an arc just below it.
 * Pure geometry, so it can be unit-tested without a canvas.
 */

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Stage {
	readonly cx: number;
	readonly cy: number;
	/** On-screen radius of the current stop at natural size. */
	readonly natural: number;
}

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

export interface SmallerLayout {
	/** Where the neighbour sits at true scale. */
	readonly anchor: Point;
	/** Magnifier centre, or null when the neighbour is big enough to see. */
	readonly lens: Point | null;
	/** Top centre of the caption, or null on narrow screens where the text panel names it. */
	readonly label: Point | null;
}

export interface Horizon {
	readonly cx: number;
	readonly cy: number;
	readonly radius: number;
}

export const LENS_RADIUS = 34;
/** Below this on-screen radius (px) the smaller neighbour gets a magnifier. */
export const LENS_THRESHOLD = 12;

const MARGIN = 16;
const HEADER_SPACE = 64;
/** Keeps references clear of the ruler on the right edge. */
const RULER_SPACE = 64;
/** Clear space (px) between the subject's outline and the smaller neighbour. */
const NEIGHBOUR_GAP = 10;
/** The neighbour is clipped to this multiple of its radius when drawn. */
export const NEIGHBOUR_CLIP = 1.15;
/** Preferred direction of the neighbour from the subject: below right (radians, y down). */
const PREFERRED_ANGLE = Math.PI / 4;
/** Angles tried, alternating either side of the preferred one. */
const ANGLES = Array.from({ length: 37 }, (_, k) => {
	const step = Math.ceil(k / 2) * (Math.PI / 36);
	return PREFERRED_ANGLE + (k % 2 ? step : -step);
});
/** On a phone the text panel starts this far (in subject radii) below the centre. */
const COMPACT_FLOOR = 1.3;
const HORIZON_GAP = 1.08;
const MAX_HORIZON_RADIUS = 1e6;
/** Below this width the text panel takes the bottom of the screen. */
export const COMPACT_WIDTH = 700;

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
	return t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.min(Math.max(v, lo), hi);
}

/** 1 while resting on a stop, fading to 0 a quarter of the way to the next. */
export function settledness(position: number): number {
	const d = Math.abs(position - Math.round(position));
	return 1 - smoothstep(0.05, 0.3, d);
}

/**
 * Places the smaller neighbour at true scale just outside the subject, on the
 * first direction where it fits on screen. Returns null when it would only fit
 * on top of the subject, where it would look like a leftover of the last stop.
 */
export function smallerLayout(stage: Stage, viewport: Viewport, radius: number): SmallerLayout | null {
	const compact = viewport.width < COMPACT_WIDTH;
	const right = viewport.width - RULER_SPACE;
	const size = Math.max(radius * NEIGHBOUR_CLIP, 6);
	const clearance = stage.natural + size + NEIGHBOUR_GAP;
	const bottom = compact
		? Math.min(viewport.height, stage.cy + stage.natural * COMPACT_FLOOR)
		: viewport.height - MARGIN;
	const fits = (p: Point) =>
		p.x >= MARGIN + size && p.x <= right - size && p.y >= HEADER_SPACE + size && p.y <= bottom - size;
	const anchor = ANGLES.map((a) => ({
		x: stage.cx + Math.cos(a) * clearance,
		y: stage.cy + Math.sin(a) * clearance
	})).find(fits);
	if (!anchor) return null;
	const below = (p: Point, r: number): Point | null => (compact ? null : { x: p.x, y: p.y + r + 8 });
	if (radius >= LENS_THRESHOLD) return { anchor, lens: null, label: below(anchor, radius) };

	const step = LENS_RADIUS * 1.4;
	const goRight = anchor.x + step + LENS_RADIUS <= right;
	// On a phone the lens sits level with the speck; below it is the text panel.
	const dy = compact ? 0 : LENS_RADIUS * 1.3;
	const lens = {
		x: clamp(anchor.x + (goRight ? step : -step), MARGIN + LENS_RADIUS, right - LENS_RADIUS),
		y: clamp(anchor.y + dy, HEADER_SPACE + LENS_RADIUS, viewport.height - MARGIN - LENS_RADIUS)
	};
	return { anchor, lens, label: below(lens, LENS_RADIUS) };
}

/** The bigger neighbour as a circle at true scale whose top just clears the subject. */
export function horizon(stage: Stage, radius: number): Horizon {
	const r = Math.min(radius, MAX_HORIZON_RADIUS);
	return { cx: stage.cx, cy: stage.cy + stage.natural * HORIZON_GAP + r, radius: r };
}
