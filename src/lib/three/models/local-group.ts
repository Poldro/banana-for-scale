/**
 * The Local Group in 3D: real sky positions and distances of its main
 * galaxies (rounded), around the Milky Way–Andromeda pair. Galaxy discs are
 * drawn at their true size; most of the group is empty space.
 */
import { Euler, Group, Scene, Vector3 } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite } from '../kit';
import { pointBuffer, pointCloud } from '../points';
import type { ModelFactory, ModelLabel } from '../types';
import { addSpiral } from './galaxy';

/** The stop's radius: 5 million light-years. */
const UNIT_MLY = 5;
const DEG = Math.PI / 180;

/** Right ascension (°), declination (°), distance (million light-years). */
const DWARFS: ReadonlyArray<readonly [number, number, number]> = [
	[80.9, -69.8, 0.16],
	[13.2, -72.8, 0.2],
	[283.8, -30.5, 0.07],
	[40, -34.4, 0.46],
	[15, -33.7, 0.29],
	[100.4, -51, 0.33],
	[260.1, 57.9, 0.26],
	[227.3, 67.2, 0.2],
	[153.3, -1.6, 0.29],
	[168.4, 22.2, 0.69],
	[152.1, 12.3, 0.82],
	[296.2, -14.8, 1.6],
	[16.2, 2.1, 2.4],
	[0.5, -15.5, 3],
	[149.9, 30.7, 2.6],
	[27.8, -44.4, 1.4],
	[352.2, 14.7, 3],
	[5.1, 59.3, 2.2],
	[9.7, 48.3, 2],
	[8.3, 48.5, 2.4],
	[311.7, -12.9, 3.2],
	[340.5, -64.4, 2.9],
	[6.5, -11, 2.5],
	[19.1, 33.4, 2.2],
	[11.4, 38, 2.4],
	[8.9, 36.5, 2.4],
	[10.7, 40.9, 2.5],
	[10.1, 41.7, 2.6]
];

/** Equatorial → 3D (y towards the celestial north pole), in model units. */
function place(ra: number, dec: number, mly: number): Vector3 {
	const d = mly / UNIT_MLY;
	return new Vector3(
		Math.cos(dec * DEG) * Math.cos(ra * DEG),
		Math.sin(dec * DEG),
		-Math.cos(dec * DEG) * Math.sin(ra * DEG)
	).multiplyScalar(d);
}

export const localGroup: ModelFactory = () => {
	const scene = new Scene();
	const root = new Group();
	scene.add(root);
	const content = new Group();
	root.add(content);

	const mw = new Vector3();
	const m31 = place(10.68, 41.27, 2.54);
	const m33 = place(23.46, 30.66, 2.73);
	// Centre the view between the two big spirals.
	content.position.copy(m31).multiplyScalar(-0.45);

	const buffer = pointBuffer();
	addSpiral(buffer, {
		centre: mw,
		radius: 0.05 / UNIT_MLY,
		count: 1500,
		seed: 3,
		arms: 4,
		grain: 0.05,
		tilt: new Euler(1.1, 0, 0.5)
	});
	addSpiral(buffer, {
		centre: m31,
		radius: 0.11 / UNIT_MLY,
		count: 2200,
		seed: 4,
		grain: 0.05,
		tilt: new Euler(-0.3, 0.6, 1.3)
	});
	addSpiral(buffer, {
		centre: m33,
		radius: 0.03 / UNIT_MLY,
		count: 600,
		seed: 5,
		grain: 0.06,
		tilt: new Euler(0.9, 0.2, -0.4)
	});
	for (const [ra, dec, d] of DWARFS) {
		const p = place(ra, dec, d);
		buffer.add(p.x, p.y, p.z, [0.75, 0.8, 1], 0.012);
		const glow = glowSprite('#8fa4e8', 0.05, 0.35);
		glow.position.copy(p);
		content.add(glow);
	}
	const galaxies = pointCloud(buffer.build(), 1.2);
	content.add(galaxies.points);

	const labels: ModelLabel[] = [];
	for (const [text, at, size] of [
		['Milky Way', mw, 0.16],
		['Andromeda', m31, 0.22],
		['Triangulum', m33, 0.08]
	] as const) {
		const halo = glowSprite('#9fb4ff', size, 0.6);
		halo.position.copy(at);
		content.add(halo);
		labels.push({ text, anchor: halo });
	}

	return {
		scene,
		extent: 1.05,
		ready: true,
		labels,
		update(t, spin, pixelsPerUnit) {
			root.rotation.y = spin + t * 0.02;
			galaxies.setScale(pixelsPerUnit);
		},
		dispose: () => disposeTree(scene)
	};
};
