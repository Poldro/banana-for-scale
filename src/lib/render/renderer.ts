/**
 * Canvas renderer: draws every level whose layer is currently visible,
 * largest first, each scaled by 10^(levelExp - viewExp) around the centre.
 */
import { base } from '$app/paths';
import type { Credit, Level } from '$lib/levels';
import { formatLength, layerAlpha } from '$lib/scale';
import { GENERATORS } from './generators';
import { luminance, mixHex } from './color';
import type { ModelDrawer } from './model-drawer';
import { COMPACT_WIDTH, LENS_RADIUS, horizon, settledness, smallerLayout, type Point, type Stage } from './reference';

/** Levels within this many positions of the view get their images loaded. */
const PRELOAD_RADIUS = 3;
/** Natural size of a level as a fraction of the viewport's short side. */
const NATURAL_FRACTION = 0.78;
/** Share of a portrait phone screen left above the info panel. */
const MOBILE_STAGE_FRACTION = 0.5;
/** Fraction of the lens radius the magnified neighbour fills. */
const LENS_FILL = 0.8;
const LABEL_FONT = '500 11px "Instrument Sans", system-ui, sans-serif';
const SIZE_FONT = '10px "IBM Plex Mono", ui-monospace, monospace';

type ImageState = HTMLCanvasElement | 'loading' | 'error';

export interface Renderer {
	/** `spin` is the user's rotation (rad) applied to 3D models. */
	frame(position: number, exp: number, timeSeconds: number, spin?: number): void;
	/** Switches 3D models on (a drawer) or off (null); photos are the fallback. */
	setModels(drawer: ModelDrawer | null): void;
	resize(): void;
	/** Background colour at the given position, for theming the UI. */
	background(position: number): string;
}

/** Bakes a soft elliptical edge into the image so photos melt into the page. */
function feather(img: HTMLImageElement, featherEdges: boolean): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas not supported');
	ctx.drawImage(img, 0, 0);
	if (!featherEdges) return canvas;
	ctx.globalCompositeOperation = 'destination-in';
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.scale(canvas.width / 2, canvas.height / 2);
	const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.12);
	g.addColorStop(0, '#000');
	g.addColorStop(0.5, '#000');
	g.addColorStop(0.89, 'rgba(0,0,0,0)');
	ctx.fillStyle = g;
	ctx.fillRect(-1, -1, 2, 2);
	return canvas;
}

export function createRenderer(
	canvas: HTMLCanvasElement,
	levels: readonly Level[],
	credits: Readonly<Record<string, Credit>>
): Renderer {
	const ctxOrNull = canvas.getContext('2d');
	if (!ctxOrNull) throw new Error('2D canvas not supported');
	const ctx = ctxOrNull;
	const images = new Map<string, ImageState>();
	let width = 0;
	let height = 0;
	let models: ModelDrawer | null = null;
	let spin = 0;

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function load(level: Level) {
		const credit = credits[level.id];
		if (!credit || images.has(level.id)) return;
		images.set(level.id, 'loading');
		const img = new Image();
		img.decoding = 'async';
		img.src = `${base}/${credit.file}`;
		img
			.decode()
			.then(() => {
				const multiply = level.visual.type === 'image' && level.visual.blend === 'multiply';
				images.set(level.id, feather(img, !multiply));
			})
			.catch(() => images.set(level.id, 'error'));
	}

	function background(position: number): string {
		const i = Math.max(0, Math.min(Math.floor(position), levels.length - 1));
		const j = Math.min(i + 1, levels.length - 1);
		return mixHex(levels[i].bg, levels[j].bg, position - i);
	}

	function drawLevel(level: Level, r: number, t: number) {
		if (level.model && models?.draw(ctx, level.model.kind, r, t, spin)) return;
		const visual = level.visual;
		if (visual.type === 'generated') {
			GENERATORS[visual.kind](ctx, r, t);
			return;
		}
		const img = images.get(level.id);
		if (!(img instanceof HTMLCanvasElement)) return;
		const k = (2 * r) / Math.max(img.width, img.height);
		if (visual.blend) ctx.globalCompositeOperation = visual.blend;
		ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k);
	}

	/**
	 * Where the zoom is centred and how big a level is at natural size.
	 * On narrow portrait screens the text panel covers the bottom ~45%, so
	 * the stage moves up into the free space above it.
	 */
	function stage(): Stage {
		const portrait = width < 700 && height > width * 1.2;
		if (!portrait) {
			return { cx: width / 2, cy: height / 2, natural: (Math.min(width, height) * NATURAL_FRACTION) / 2 };
		}
		const free = height * MOBILE_STAGE_FRACTION;
		return { cx: width / 2, cy: free / 2 + 24, natural: (Math.min(width, free) * NATURAL_FRACTION) / 2 };
	}

	/** Title and size of a neighbour, centred under `at`. */
	function caption(level: Level, at: Point, ink: string) {
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		ctx.fillStyle = `rgba(${ink},0.85)`;
		ctx.font = LABEL_FONT;
		ctx.fillText(level.title, at.x, at.y);
		ctx.fillStyle = `rgba(${ink},0.55)`;
		ctx.font = SIZE_FONT;
		ctx.fillText(formatLength(level.exp), at.x, at.y + 14);
	}

	/** The next smaller stop at true scale beside the subject, magnified if tiny. */
	function drawSmaller(level: Level, st: Stage, exp: number, ink: string, t: number) {
		const r = st.natural * Math.pow(10, level.exp - exp);
		const { anchor, lens, label } = smallerLayout(st, { width, height }, r);
		ctx.save();
		ctx.translate(anchor.x, anchor.y);
		if (lens) {
			ctx.fillStyle = `rgba(${ink},0.9)`;
			ctx.beginPath();
			ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.beginPath();
			ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
			ctx.clip();
			drawLevel(level, r, t);
		}
		ctx.restore();

		if (lens) {
			const dx = lens.x - anchor.x;
			const dy = lens.y - anchor.y;
			const d = Math.hypot(dx, dy);
			ctx.strokeStyle = `rgba(${ink},0.4)`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(anchor.x + (dx / d) * 4, anchor.y + (dy / d) * 4);
			ctx.lineTo(lens.x - (dx / d) * LENS_RADIUS, lens.y - (dy / d) * LENS_RADIUS);
			ctx.stroke();

			ctx.save();
			ctx.translate(lens.x, lens.y);
			ctx.beginPath();
			ctx.arc(0, 0, LENS_RADIUS, 0, Math.PI * 2);
			ctx.fillStyle = level.bg;
			ctx.fill();
			ctx.clip();
			drawLevel(level, LENS_RADIUS * LENS_FILL, t);
			ctx.restore();
			ctx.strokeStyle = `rgba(${ink},0.45)`;
			ctx.beginPath();
			ctx.arc(lens.x, lens.y, LENS_RADIUS, 0, Math.PI * 2);
			ctx.stroke();
		}
		if (label) caption(level, label, ink);
	}

	/** The next bigger stop as the top of a true-scale circle under the subject. */
	function drawBigger(level: Level, st: Stage, exp: number, ink: string) {
		const h = horizon(st, st.natural * Math.pow(10, level.exp - exp));
		ctx.strokeStyle = `rgba(${ink},0.35)`;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 5]);
		ctx.beginPath();
		ctx.arc(h.cx, h.cy, h.radius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		// Caption hangs just under the apex, inside the bigger stop.
		if (width >= COMPACT_WIDTH) caption(level, { x: h.cx, y: h.cy - h.radius + 6 }, ink);
	}

	/** Neighbouring stops at true scale, shown only while resting on a stop. */
	function drawReferences(position: number, exp: number, t: number) {
		const k = settledness(position);
		if (k < 0.01) return;
		const i = Math.round(position);
		const st = stage();
		const ink = luminance(background(position)) > 0.4 ? '20,20,20' : '240,238,230';
		ctx.save();
		ctx.globalAlpha = k;
		if (levels[i + 1]) drawBigger(levels[i + 1], st, exp, ink);
		if (levels[i - 1]) drawSmaller(levels[i - 1], st, exp, ink, t);
		ctx.restore();
	}

	function frame(position: number, exp: number, t: number, userSpin = 0) {
		spin = userSpin;
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.fillStyle = background(position);
		ctx.fillRect(0, 0, width, height);
		const st = stage();

		for (let i = levels.length - 1; i >= 0; i--) {
			const level = levels[i];
			if (Math.abs(i - position) <= PRELOAD_RADIUS) {
				load(level);
				if (level.model) models?.preload(level.model.kind);
			}
			const s = level.exp - exp;
			const alpha = layerAlpha(s);
			if (alpha < 0.004) continue;
			ctx.save();
			ctx.translate(st.cx, st.cy);
			ctx.globalAlpha = alpha;
			drawLevel(level, st.natural * Math.pow(10, s), t);
			ctx.restore();
		}
		drawReferences(position, exp, t);
	}

	resize();
	return {
		frame,
		resize,
		background,
		setModels(drawer) {
			models = drawer;
		}
	};
}
