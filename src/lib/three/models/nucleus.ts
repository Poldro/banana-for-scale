/**
 * A potassium-40 nucleus: 19 protons and 21 neutrons packed into a ball.
 * Real nucleons are fuzzy and constantly moving; the marbles are a convention.
 */
import { Group, Mesh, MeshStandardMaterial, Scene, SphereGeometry, Vector3 } from 'three';
import { disposeTree } from '../dispose';
import { seeded } from '../kit';
import type { ModelFactory } from '../types';

const PROTONS = 19;
const NEUTRONS = 21;
/** Nucleon radius for a random close packing that fills a unit ball. */
const BALL = 0.25;

/** Packs balls by pulling them in and pushing overlapping pairs apart. */
function pack(count: number, seed: number): Vector3[] {
	const rand = seeded(seed);
	const balls = Array.from({ length: count }, () => new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5));
	const push = new Vector3();
	for (let step = 0; step < 300; step++) {
		for (const p of balls) p.multiplyScalar(0.985);
		for (let i = 0; i < count; i++) {
			for (let j = i + 1; j < count; j++) {
				push.subVectors(balls[j], balls[i]);
				const d = push.length();
				if (d >= BALL * 2 || d === 0) continue;
				push.multiplyScalar((BALL * 2 - d) / d / 2);
				balls[j].add(push);
				balls[i].sub(push);
			}
		}
	}
	return balls;
}

export const nucleus: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	scene.add(root);

	const rand = seeded(40);
	const order = Array.from({ length: PROTONS + NEUTRONS }, (_, i) => i).sort(() => rand() - 0.5);
	const isProton = new Set(order.slice(0, PROTONS));
	const geometry = new SphereGeometry(BALL * 0.97, 32, 24);
	const protonMaterial = new MeshStandardMaterial({
		color: '#e0475d',
		roughness: 0.45
	});
	const neutronMaterial = new MeshStandardMaterial({
		color: '#6f80c8',
		roughness: 0.45
	});
	const balls = pack(PROTONS + NEUTRONS, 7);
	// Scale the whole packing so the outermost ball just touches the unit sphere.
	root.scale.setScalar(1 / (Math.max(...balls.map((b) => b.length())) + BALL));
	balls.forEach((p, i) => {
		const ball = new Mesh(geometry, isProton.has(i) ? protonMaterial : neutronMaterial);
		ball.position.copy(p);
		root.add(ball);
	});

	return {
		scene,
		extent: 1.25,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin + t * 0.15;
			root.rotation.x = Math.sin(t * 0.11) * 0.3;
		},
		dispose: () => disposeTree(scene)
	};
};
