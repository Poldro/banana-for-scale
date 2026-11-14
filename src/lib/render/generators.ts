/**
 * Procedural illustrations for scales where no photograph exists
 * (sub-atomic) or where a diagram explains more than a picture (orbits,
 * cosmic structure). Each generator draws centred on the origin; `r` is the
 * on-screen radius in CSS pixels that corresponds to the level's size, and
 * `t` is time in seconds for gentle motion.
 */
import type { GeneratedKind } from '$lib/levels';

export type Generator = (ctx: CanvasRenderingContext2D, r: number, t: number) => void;

const TAU = Math.PI * 2;

/** Deterministic PRNG so illustrations look the same on every visit. */
export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let x = Math.imul(a ^ (a >>> 15), 1 | a);
		x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
}

function points(seed: number, n: number, spread = 1): ReadonlyArray<readonly number[]> {
	const rand = rng(seed);
	return Array.from({ length: n }, () => {
		const a = rand() * TAU;
		const d = Math.sqrt(rand()) * spread;
		return [Math.cos(a) * d, Math.sin(a) * d, rand(), rand()];
	});
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
	if (radius <= 0) return;
	const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
	g.addColorStop(0, color);
	g.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, Math.max(radius, 0.5), 0, TAU);
	ctx.fill();
}

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, r: number): void {
	// Labels only make sense while the diagram is roughly on screen.
	if (r < 80 || r > 6000) return;
	ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
	ctx.fillStyle = 'rgba(220,225,255,0.75)';
	ctx.textAlign = 'center';
	// A dark halo keeps labels readable over bright, glowing parts.
	ctx.shadowColor = 'rgba(0,0,0,0.85)';
	ctx.shadowBlur = 6;
	ctx.fillText(text, x, y);
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
}

function ring(ctx: CanvasRenderingContext2D, radius: number, color: string, width = 1) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.arc(0, 0, radius, 0, TAU);
	ctx.stroke();
}

const FOAM = points(11, 140);
const foam: Generator = (ctx, r, t) => {
	ctx.globalCompositeOperation = 'lighter';
	for (const [x, y, a, b] of FOAM) {
		const pulse = 0.5 + 0.5 * Math.sin(t * (1.5 + b * 3) + a * TAU);
		const size = r * (0.03 + 0.12 * a) * pulse;
		ctx.strokeStyle = `rgba(170,140,255,${0.15 + 0.35 * pulse})`;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(x * r, y * r, size, 0, TAU);
		ctx.stroke();
	}
	glow(ctx, 0, 0, r, 'rgba(120,80,220,0.18)');
};

const VOID = points(12, 60, 1.6);
const voidGen: Generator = (ctx, r, t) => {
	for (const [x, y, a] of VOID) {
		const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.4 + a * 20));
		dot(ctx, x * r, y * r, 1, `rgba(150,140,200,${0.25 * twinkle})`);
	}
	ring(ctx, r, 'rgba(150,140,200,0.12)');
	ctx.setLineDash([4, 8]);
	ring(ctx, r * 0.5, 'rgba(150,140,200,0.1)');
	ctx.setLineDash([]);
};

const COLOR_CHARGE = ['#ff5a6e', '#57e38b', '#5aa2ff'];
const quarks: Generator = (ctx, r, t) => {
	ctx.globalCompositeOperation = 'lighter';
	COLOR_CHARGE.forEach((c, i) => {
		const a = t * 0.3 + (i * TAU) / 3;
		const x = Math.cos(a) * r * 0.55;
		const y = Math.sin(a) * r * 0.55;
		glow(ctx, x, y, 26, c + '88');
		dot(ctx, x, y, 2.5, '#fff');
	});
	glow(ctx, 0, 0, 14, 'rgba(255,240,150,0.5)');
	dot(ctx, 0, 0, 1.5, '#fff');
	label(ctx, 'quarks', 0, r * 0.55 + 40, r);
	label(ctx, 'electron (no size measured)', 0, 30, r);
};

function gluon(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, t: number) {
	const len = Math.hypot(x2 - x1, y2 - y1);
	const nx = (y1 - y2) / len;
	const ny = (x2 - x1) / len;
	ctx.strokeStyle = 'rgba(255,220,140,0.55)';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	for (let s = 0; s <= 1.0001; s += 0.02) {
		const wave = Math.sin(s * 18 + t * 6) * len * 0.04;
		const x = x1 + (x2 - x1) * s + nx * wave;
		const y = y1 + (y2 - y1) * s + ny * wave;
		if (s === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
}

const proton: Generator = (ctx, r, t) => {
	glow(ctx, 0, 0, r * 1.1, 'rgba(255,120,90,0.35)');
	const qs = COLOR_CHARGE.map((c, i) => {
		const a = (i * TAU) / 3 + Math.sin(t * 0.7 + i) * 0.4;
		const d = r * (0.45 + 0.1 * Math.sin(t * 1.3 + i * 2));
		return [Math.cos(a) * d, Math.sin(a) * d, c] as const;
	});
	qs.forEach(([x, y], i) => {
		const [x2, y2] = qs[(i + 1) % 3];
		gluon(ctx, x, y, x2, y2, t);
	});
	ctx.globalCompositeOperation = 'lighter';
	for (const [x, y, c] of qs) {
		glow(ctx, x, y, r * 0.22, c);
		dot(ctx, x, y, r * 0.05, '#fff');
	}
	label(ctx, 'up', qs[0][0], qs[0][1] - r * 0.15, r);
	label(ctx, 'up', qs[1][0], qs[1][1] - r * 0.15, r);
	label(ctx, 'down', qs[2][0], qs[2][1] - r * 0.15, r);
};

/** 40 nucleons packed in a ball, drawn back-to-front. */
const NUCLEONS = (() => {
	const n = 40;
	const golden = Math.PI * (3 - Math.sqrt(5));
	const rand = rng(40);
	const ns = Array.from({ length: n }, (_, i) => {
		const y = 1 - (i / (n - 1)) * 2;
		const rad = Math.sqrt(1 - y * y);
		const depth = 0.35 + 0.65 * Math.cbrt(rand());
		return { x: Math.cos(golden * i) * rad * depth, y: y * depth, z: Math.sin(golden * i) * rad * depth, proton: false };
	});
	const order = ns.map((_, i) => i).sort(() => rand() - 0.5);
	order.slice(0, 19).forEach((i) => (ns[i].proton = true));
	return ns.sort((a, b) => a.z - b.z);
})();

const nucleus: Generator = (ctx, r, t) => {
	const ball = r * 0.26;
	const spin = t * 0.15;
	for (const n of NUCLEONS) {
		const x = (n.x * Math.cos(spin) - n.z * Math.sin(spin)) * r * 0.78;
		const y = n.y * r * 0.78;
		const g = ctx.createRadialGradient(x - ball * 0.35, y - ball * 0.35, ball * 0.1, x, y, ball);
		g.addColorStop(0, n.proton ? '#ffb1a1' : '#c9d4ff');
		g.addColorStop(1, n.proton ? '#a3283a' : '#3c4a8f');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, ball, 0, TAU);
		ctx.fill();
	}
	label(ctx, '19 protons · 21 neutrons', 0, -r - 20, r);
};

const SHELLS = [2, 8, 8, 1];
const atom: Generator = (ctx, r, t) => {
	ctx.globalCompositeOperation = 'lighter';
	glow(ctx, 0, 0, r, 'rgba(90,140,255,0.35)');
	SHELLS.forEach((count, s) => {
		const radius = r * (0.18 + s * 0.26);
		ring(ctx, radius, 'rgba(140,180,255,0.12)');
		for (let k = 0; k < count; k++) {
			const a = t * (0.9 / (s + 1)) + (k * TAU) / count + s;
			const x = Math.cos(a) * radius;
			const y = Math.sin(a) * radius;
			glow(ctx, x, y, 10, 'rgba(160,210,255,0.8)');
			dot(ctx, x, y, 1.6, '#fff');
		}
	});
	// The nucleus is 1/60,000 of the atom: honestly, a speck.
	dot(ctx, 0, 0, Math.max(r / 60000, 0.8), '#ffd27a');
	label(ctx, 'the nucleus is the dot in the middle — no, smaller', 0, -r - 20, r);
};

const BASE_COLORS = ['#ff7a59', '#ffd166', '#06d6a0', '#4cc9f0'];
const dna: Generator = (ctx, r, t) => {
	const length = r * 7;
	const steps = 70;
	const twist = t * 0.8;
	for (let i = 0; i <= steps; i++) {
		const y = -length / 2 + (length * i) / steps;
		const phase = (y / r) * 1.1 + twist;
		const xa = Math.sin(phase) * r;
		const xb = Math.sin(phase + Math.PI) * r;
		const front = Math.cos(phase);
		if (i % 2 === 0) {
			ctx.save();
			ctx.strokeStyle = BASE_COLORS[i % 4];
			ctx.globalAlpha *= 0.6 + 0.4 * Math.abs(front);
			ctx.lineWidth = Math.max(1, r * 0.08);
			ctx.beginPath();
			ctx.moveTo(xa, y);
			ctx.lineTo(xb, y);
			ctx.stroke();
			ctx.restore();
		}
		dot(ctx, xa, y, r * 0.09 * (0.8 + 0.2 * front), '#cfe3ff');
		dot(ctx, xb, y, r * 0.09 * (0.8 - 0.2 * front), '#9fb7e8');
	}
};

const SUBUNITS = { large: points(71, 70, 1), small: points(72, 45, 1) };
const ribosome: Generator = (ctx, r, t) => {
	const blob = (pts: typeof SUBUNITS.large, cx: number, cy: number, rx: number, ry: number, c: string) => {
		for (const [x, y, a] of pts) dot(ctx, cx + x * rx, cy + y * ry, r * (0.1 + 0.08 * a), c);
	};
	blob(SUBUNITS.large, 0, -r * 0.18, r * 0.75, r * 0.55, 'rgba(120,170,230,0.85)');
	blob(SUBUNITS.small, 0, r * 0.5, r * 0.6, r * 0.3, 'rgba(240,200,120,0.85)');
	// mRNA threading through, and a growing protein chain.
	ctx.strokeStyle = '#ff6b8b';
	ctx.lineWidth = Math.max(1, r * 0.05);
	ctx.beginPath();
	for (let x = -r * 2; x <= r * 2; x += r * 0.05) {
		const y = r * 0.25 + Math.sin(x / (r * 0.25) - t * 2) * r * 0.04;
		if (x === -r * 2) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
	for (let k = 0; k < 9; k++) {
		const a = -Math.PI / 2 - 0.3 + Math.sin(t + k * 0.6) * 0.2;
		const d = r * (0.9 + k * 0.17);
		dot(ctx, Math.cos(a) * d * 0.4 + k * r * 0.05, Math.sin(a) * d, r * 0.07, BASE_COLORS[k % 4]);
	}
	label(ctx, 'mRNA in → protein out', 0, -r * 1.2, r);
};

interface Orbit {
	name: string;
	au: number;
	years: number;
	color: string;
	size: number;
}

const PLANETS: readonly Orbit[] = [
	{ name: 'Mercury', au: 0.387, years: 0.241, color: '#b9b2a8', size: 2 },
	{ name: 'Venus', au: 0.723, years: 0.615, color: '#f1d39b', size: 3 },
	{ name: 'Earth', au: 1, years: 1, color: '#5fa8ff', size: 3 },
	{ name: 'Mars', au: 1.524, years: 1.881, color: '#ff7b54', size: 2.5 },
	{ name: 'Jupiter', au: 5.2, years: 11.86, color: '#e3c29b', size: 4 },
	{ name: 'Saturn', au: 9.54, years: 29.46, color: '#f0dca8', size: 3.5 },
	{ name: 'Uranus', au: 19.2, years: 84.0, color: '#a6e3ea', size: 3 },
	{ name: 'Neptune', au: 30.07, years: 164.8, color: '#6e8bff', size: 3 }
];

function orbits(ctx: CanvasRenderingContext2D, pxPerAu: number, t: number, yearsPerSecond: number) {
	ctx.globalCompositeOperation = 'lighter';
	glow(ctx, 0, 0, Math.max(6, pxPerAu * 0.05), 'rgba(255,210,120,0.9)');
	for (const p of PLANETS) {
		const radius = p.au * pxPerAu;
		if (radius < 3) continue;
		ring(ctx, radius, 'rgba(160,180,255,0.18)');
		const a = (t * yearsPerSecond * TAU) / p.years + p.au;
		const x = Math.cos(a) * radius;
		const y = Math.sin(a) * radius;
		dot(ctx, x, y, p.size, p.color);
		if (radius > 40) label(ctx, p.name, x, y - 10, radius * 2);
	}
}

const innerOrbits: Generator = (ctx, r, t) => orbits(ctx, r, t, 0.15);
const outerOrbits: Generator = (ctx, r, t) => orbits(ctx, r / 30.07, t, 3);

const heliosphere: Generator = (ctx, r, t) => {
	const au = r / 120;
	// Heliopause: a blunt nose upwind, a long tail downwind.
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createRadialGradient(r * 0.4, 0, r * 0.3, r * 0.4, 0, r * 1.6);
	g.addColorStop(0, 'rgba(90,140,255,0.22)');
	g.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.ellipse(r * 0.45, 0, r * 1.45, r, 0, 0, TAU);
	ctx.fill();
	ctx.setLineDash([3, 6]);
	ring(ctx, 90 * au, 'rgba(140,200,255,0.35)');
	ctx.setLineDash([]);
	orbits(ctx, au, t, 3);
	// Voyager 1, ~170 AU out in 2026, beyond the nose.
	const vx = -170 * au * Math.cos(0.6);
	const vy = -170 * au * Math.sin(0.6);
	glow(ctx, vx, vy, 10, 'rgba(255,255,255,0.7)');
	label(ctx, 'Voyager 1', vx, vy - 12, r);
	label(ctx, 'termination shock', 0, 90 * au + 18, r);
};

const OORT = points(81, 900, 1);
const oort: Generator = (ctx, r) => {
	for (const [x, y, a] of OORT) {
		const d = Math.hypot(x, y);
		if (d < 0.03) continue;
		dot(ctx, x * r, y * r, 0.7, `rgba(190,215,255,${0.2 + 0.4 * a})`);
	}
	glow(ctx, 0, 0, 8, 'rgba(255,210,120,0.9)');
	label(ctx, 'Sun and planets: a dot', 0, 22, r);
};

const DWARFS = points(91, 70, 1);
function spiral(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number, color: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(tilt);
	ctx.scale(1, 0.45);
	glow(ctx, 0, 0, size, color);
	glow(ctx, 0, 0, size * 0.3, 'rgba(255,240,210,0.9)');
	ctx.restore();
}

const localGroup: Generator = (ctx, r) => {
	ctx.globalCompositeOperation = 'lighter';
	for (const [x, y, a] of DWARFS) dot(ctx, x * r * 0.9, y * r * 0.9, 1 + a, 'rgba(200,210,255,0.5)');
	const mw: [number, number] = [-r * 0.12, r * 0.08];
	const m31: [number, number] = [r * 0.38, -r * 0.18];
	spiral(ctx, ...mw, r * 0.07, 0.4, 'rgba(160,190,255,0.8)');
	spiral(ctx, ...m31, r * 0.11, -0.6, 'rgba(190,200,255,0.8)');
	spiral(ctx, r * 0.5, -r * 0.02, r * 0.035, 1.2, 'rgba(170,190,255,0.6)');
	label(ctx, 'Milky Way', mw[0], mw[1] + 24, r);
	label(ctx, 'Andromeda', m31[0], m31[1] + 30, r);
	label(ctx, 'Triangulum', r * 0.5, r * 0.04, r);
};

/** Filaments: connect random nodes to their nearest neighbours. */
const WEB = (() => {
	const nodes = points(101, 90, 1.25);
	const edges: Array<[number, number]> = [];
	nodes.forEach((a, i) => {
		nodes
			.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])] as const)
			.filter(([j]) => j !== i)
			.sort((p, q) => p[1] - q[1])
			.slice(0, 3)
			.forEach(([j]) => i < j && edges.push([i, j]));
	});
	const rand = rng(102);
	const galaxies = edges.flatMap(([i, j]) =>
		Array.from({ length: 14 }, () => {
			const s = rand();
			const jitter = (rand() - 0.5) * 0.03;
			return [
				nodes[i][0] + (nodes[j][0] - nodes[i][0]) * s + jitter,
				nodes[i][1] + (nodes[j][1] - nodes[i][1]) * s - jitter,
				rand()
			];
		})
	);
	return { nodes, galaxies };
})();

const cosmicWeb: Generator = (ctx, r) => {
	ctx.globalCompositeOperation = 'lighter';
	for (const [x, y, a] of WEB.galaxies) dot(ctx, x * r, y * r, 0.6 + a, `rgba(150,170,255,${0.25 + 0.35 * a})`);
	for (const [x, y] of WEB.nodes) glow(ctx, x * r, y * r, r * 0.05, 'rgba(180,160,255,0.35)');
	glow(ctx, 0, 0, 10, 'rgba(255,230,160,0.9)');
	label(ctx, 'you are here', 0, 24, r);
};

export const GENERATORS: Readonly<Record<GeneratedKind, Generator>> = {
	foam,
	void: voidGen,
	quarks,
	proton,
	nucleus,
	atom,
	dna,
	ribosome,
	'inner-orbits': innerOrbits,
	heliosphere,
	'outer-orbits': outerOrbits,
	oort,
	'local-group': localGroup,
	'cosmic-web': cosmicWeb
};
