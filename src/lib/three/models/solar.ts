/**
 * Planet orbits from their real orbital elements (J2000, rounded), so the 3D
 * view shows eccentricities and inclinations — including Pluto's tilted,
 * stretched orbit that crosses Neptune's.
 */
import {
	BufferGeometry,
	Group,
	LineBasicMaterial,
	LineLoop,
	Mesh,
	MeshBasicMaterial,
	SphereGeometry,
	Vector3
} from 'three';
import { glowSprite } from '../kit';
import type { ModelLabel } from '../types';

export interface Body {
	readonly name: string;
	/** Semi-major axis (AU), eccentricity, inclination (°), longitude of node (°), argument of perihelion (°). */
	readonly a: number;
	readonly e: number;
	readonly i: number;
	readonly node: number;
	readonly peri: number;
	readonly years: number;
	readonly color: string;
}

export const PLANETS: readonly Body[] = [
	{
		name: 'Mercury',
		a: 0.387,
		e: 0.206,
		i: 7.0,
		node: 48.3,
		peri: 29.1,
		years: 0.241,
		color: '#b9b2a8'
	},
	{
		name: 'Venus',
		a: 0.723,
		e: 0.007,
		i: 3.39,
		node: 76.7,
		peri: 54.9,
		years: 0.615,
		color: '#f1d39b'
	},
	{
		name: 'Earth',
		a: 1,
		e: 0.017,
		i: 0,
		node: 0,
		peri: 102.9,
		years: 1,
		color: '#5fa8ff'
	},
	{
		name: 'Mars',
		a: 1.524,
		e: 0.093,
		i: 1.85,
		node: 49.6,
		peri: 286.5,
		years: 1.881,
		color: '#ff7b54'
	},
	{
		name: 'Jupiter',
		a: 5.2,
		e: 0.049,
		i: 1.3,
		node: 100.5,
		peri: 273.9,
		years: 11.86,
		color: '#e3c29b'
	},
	{
		name: 'Saturn',
		a: 9.54,
		e: 0.057,
		i: 2.49,
		node: 113.7,
		peri: 339.4,
		years: 29.46,
		color: '#f0dca8'
	},
	{
		name: 'Uranus',
		a: 19.2,
		e: 0.046,
		i: 0.77,
		node: 74.0,
		peri: 96.9,
		years: 84.0,
		color: '#a6e3ea'
	},
	{
		name: 'Neptune',
		a: 30.07,
		e: 0.01,
		i: 1.77,
		node: 131.8,
		peri: 273.2,
		years: 164.8,
		color: '#6e8bff'
	},
	{
		name: 'Pluto',
		a: 39.48,
		e: 0.249,
		i: 17.16,
		node: 110.3,
		peri: 113.8,
		years: 248,
		color: '#d8c6b0'
	}
];

const DEG = Math.PI / 180;
const ORBIT_STEPS = 256;

/** Heliocentric position (AU) at mean anomaly `m`; y is ecliptic north. */
export function orbitPosition(b: Body, m: number, out = new Vector3()): Vector3 {
	let E = m;
	for (let k = 0; k < 6; k++) E -= (E - b.e * Math.sin(E) - m) / (1 - b.e * Math.cos(E));
	const x = b.a * (Math.cos(E) - b.e);
	const y = b.a * Math.sqrt(1 - b.e * b.e) * Math.sin(E);
	const [w, O, i] = [b.peri * DEG, b.node * DEG, b.i * DEG];
	const cw = Math.cos(w),
		sw = Math.sin(w),
		cO = Math.cos(O),
		sO = Math.sin(O),
		ci = Math.cos(i),
		si = Math.sin(i);
	const ex = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y;
	const ey = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y;
	const ez = sw * si * x + cw * si * y;
	return out.set(ex, ez, -ey);
}

export interface SolarSystem {
	readonly group: Group;
	readonly labels: ModelLabel[];
	/** Moves the planets: `yearsPerSecond` of orbit per second of `t`. */
	update(t: number, yearsPerSecond: number): void;
}

/**
 * Orbits and planets for `bodies`, scaled so 1 AU = `unit` model units.
 * Planet dots have a fixed size `dot`: at these scales real planets are
 * far too small to see.
 */
export function solarSystem(bodies: readonly Body[], unit: number, dot: number, withLabels = true): SolarSystem {
	const group = new Group();
	group.add(glowSprite('#ffd27a', dot * 9));
	const orbitMaterial = new LineBasicMaterial({
		color: '#a0b4ff',
		transparent: true,
		opacity: 0.22
	});
	const sphere = new SphereGeometry(dot, 16, 12);
	const labels: ModelLabel[] = [];
	const planets = bodies.map((b) => {
		const points = Array.from({ length: ORBIT_STEPS }, (_, k) =>
			orbitPosition(b, (k / ORBIT_STEPS) * Math.PI * 2).multiplyScalar(unit)
		);
		group.add(new LineLoop(new BufferGeometry().setFromPoints(points), orbitMaterial));
		const planet = new Group();
		planet.add(new Mesh(sphere, new MeshBasicMaterial({ color: b.color })));
		planet.add(glowSprite(b.color, dot * 6, 0.7));
		group.add(planet);
		// Inner orbits crowd the Sun at wide zooms; only label the ones that stand apart.
		if (withLabels && b.a * unit > 0.12) labels.push({ text: b.name, anchor: planet });
		return { body: b, planet, phase: b.a * 2.3 };
	});
	const scratch = new Vector3();
	return {
		group,
		labels,
		update(t, yearsPerSecond) {
			for (const { body, planet, phase } of planets) {
				const m = phase + (t * yearsPerSecond * Math.PI * 2) / body.years;
				planet.position.copy(orbitPosition(body, m, scratch).multiplyScalar(unit));
			}
		}
	};
}
