/**
 * The cosmic web around us: galaxies strung along filaments between dense
 * clusters, with voids in between. Laniakea, our supercluster, is one basin
 * of this web. A statistical sketch, not a survey map.
 */
import { Group, Scene, Vector3 } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, seeded } from '../kit';
import { pointBuffer, pointCloud } from '../points';
import type { ModelFactory, ModelLabel } from '../types';

const NODES = 70;
const LINKS = 3;
const PER_FILAMENT = 90;

function web() {
	const rand = seeded(101);
	const nodes = Array.from({ length: NODES }, () => {
		const v = new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
		return v.multiplyScalar(1.15);
	});
	const buffer = pointBuffer();
	const seen = new Set<string>();
	const jitter = () => (rand() + rand() - 1) * 0.035;
	nodes.forEach((a, i) => {
		const nearest = nodes
			.map((b, j) => [j, a.distanceTo(b)] as const)
			.filter(([j]) => j !== i)
			.sort((p, q) => p[1] - q[1])
			.slice(0, LINKS);
		for (const [j] of nearest) {
			const key = i < j ? `${i}-${j}` : `${j}-${i}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const b = nodes[j];
			for (let k = 0; k < PER_FILAMENT; k++) {
				const s = rand();
				const glow = 0.3 + 0.5 * rand();
				buffer.add(
					a.x + (b.x - a.x) * s + jitter(),
					a.y + (b.y - a.y) * s + jitter(),
					a.z + (b.z - a.z) * s + jitter(),
					[0.55 * glow, 0.62 * glow, glow],
					0.008
				);
			}
		}
		// Clusters sit where filaments meet.
		for (let k = 0; k < 40; k++) {
			const glow = 0.5 + 0.5 * rand();
			buffer.add(a.x + jitter(), a.y + jitter(), a.z + jitter(), [0.8 * glow, 0.72 * glow, glow], 0.012);
		}
	});
	return pointCloud(buffer.build(), 1);
}

export const cosmicWeb: ModelFactory = () => {
	const scene = new Scene();
	const root = new Group();
	root.rotation.x = 0.25;
	scene.add(root);
	const galaxies = web();
	root.add(galaxies.points);
	const here = glowSprite('#ffe6a0', 0.05);
	root.add(here);
	const labels: ModelLabel[] = [{ text: 'you are here', anchor: here }];
	return {
		scene,
		extent: 1.25,
		ready: true,
		labels,
		update(t, spin, pixelsPerUnit) {
			root.rotation.y = spin + t * 0.02;
			galaxies.setScale(pixelsPerUnit);
		},
		dispose: () => disposeTree(scene)
	};
};
