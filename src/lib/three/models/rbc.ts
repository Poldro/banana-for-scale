/**
 * Red blood cells: soft discs dimpled on both sides (biconcave), which gives
 * them lots of surface for oxygen and lets them fold through capillaries.
 * Profile from Evans & Fung (1972).
 */
import { Group, LatheGeometry, Mesh, MeshPhysicalMaterial, Scene, Vector2 } from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

/** Thickness coefficients from Evans & Fung, divided by the cell radius (3.91 µm). */
const C0 = 0.207;
const C1 = 2.003;
const C2 = -1.123;
const STEPS = 48;

function biconcave(): LatheGeometry {
	const half = (x: number) => (Math.sqrt(Math.max(0, 1 - x * x)) * (C0 + C1 * x * x + C2 * x ** 4)) / 2;
	const xs = Array.from({ length: STEPS + 1 }, (_, k) => Math.sin((k / STEPS) * (Math.PI / 2)));
	// From the bottom of the axis out to the rim, then back in over the top.
	const profile = [
		...xs.map((x) => new Vector2(x, -half(x))),
		...xs
			.slice(0, -1)
			.reverse()
			.map((x) => new Vector2(x, half(x)))
	];
	return new LatheGeometry(profile, 96);
}

export const rbc: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	scene.add(root);
	const geometry = biconcave();
	const material = new MeshPhysicalMaterial({
		color: '#c0202a',
		roughness: 0.45,
		sheen: 0.6,
		sheenColor: '#ff8a80',
		clearcoat: 0.2
	});
	const cells = [
		{ x: 0, y: 0, z: 0, rx: 1.05, rz: 0.15, s: 1 },
		{ x: 0.85, y: -0.7, z: -1.2, rx: 0.3, rz: 0.9, s: 0.55 },
		{ x: -0.9, y: 0.75, z: -1.6, rx: 1.7, rz: -0.6, s: 0.5 }
	].map((c) => {
		const cell = new Mesh(geometry, material);
		cell.position.set(c.x, c.y, c.z);
		cell.rotation.set(c.rx, 0, c.rz);
		cell.scale.setScalar(c.s);
		root.add(cell);
		return cell;
	});

	return {
		scene,
		extent: 1.5,
		ready: true,
		update(t, spin) {
			cells[0].rotation.y = spin * 0.6;
			root.rotation.y = spin * 0.4 + Math.sin(t * 0.12) * 0.2;
		},
		dispose: () => disposeTree(scene)
	};
};
