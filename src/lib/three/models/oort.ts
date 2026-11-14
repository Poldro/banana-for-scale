/**
 * The Oort cloud: a flattened inner cloud near the planets' plane and a
 * spherical outer shell of icy bodies, about a light-year and a half out.
 * Each dot stands for billions of comets, each a few kilometres across.
 */
import { Group, Scene } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, seeded } from '../kit';
import { pointBuffer, pointCloud, thinningGain } from '../points';
import type { ModelFactory, ModelLabel } from '../types';

const OUTER = 5000;
const INNER = 2500;

function cloud(detail: number) {
	const rand = seeded(81);
	const buffer = pointBuffer();
	const direction = () => {
		const u = rand() * 2 - 1;
		const a = rand() * Math.PI * 2;
		const s = Math.sqrt(1 - u * u);
		return [Math.cos(a) * s, u, Math.sin(a) * s] as const;
	};
	for (let k = 0; k < Math.round(OUTER * detail); k++) {
		const [x, y, z] = direction();
		const d = 0.3 + 0.7 * Math.cbrt(rand());
		const b = 0.35 + 0.5 * rand();
		buffer.add(x * d, y * d, z * d, [0.6 * b, 0.72 * b, b], 0.006);
	}
	for (let k = 0; k < Math.round(INNER * detail); k++) {
		const a = rand() * Math.PI * 2;
		const d = 0.03 + 0.3 * Math.sqrt(rand());
		const h = (rand() - 0.5) * d * 0.5;
		const b = 0.4 + 0.5 * rand();
		buffer.add(Math.cos(a) * d, h, Math.sin(a) * d, [0.75 * b, 0.82 * b, b], 0.004);
	}
	return pointCloud(buffer.build(), 1, thinningGain(detail));
}

export const oort: ModelFactory = ({ detail }) => {
	const scene = new Scene();
	const root = new Group();
	root.rotation.x = 0.3;
	scene.add(root);
	const comets = cloud(detail);
	root.add(comets.points);
	const sun = glowSprite('#ffd27a', 0.04);
	root.add(sun);
	const labels: ModelLabel[] = [{ text: 'Sun and planets: a dot', anchor: sun }];
	return {
		scene,
		extent: 1.1,
		ready: true,
		labels,
		update(t, spin, pixelsPerUnit) {
			root.rotation.y = spin + t * 0.02;
			comets.setScale(pixelsPerUnit);
		},
		dispose: () => disposeTree(scene)
	};
};
