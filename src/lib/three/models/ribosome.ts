/**
 * A ribosome in the style of a molecular surface: a large subunit (blue) and a
 * small subunit (gold) clamp a strand of mRNA, and a new protein chain leaves
 * through a tunnel in the large subunit. Shapes are simplified.
 */
import {
	CatmullRomCurve3,
	Group,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Scene,
	SphereGeometry,
	TubeGeometry,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { seeded } from '../kit';
import type { ModelFactory, ModelLabel } from '../types';

const BASE_COLORS = ['#ff7a59', '#ffd166', '#06d6a0', '#4cc9f0'];
const CHAIN = 9;

/** A lumpy ellipsoid made of overlapping spheres, like an atom-by-atom surface. */
function lump(count: number, radii: Vector3, centre: Vector3, color: string, seed: number): InstancedMesh {
	const rand = seeded(seed);
	const mesh = new InstancedMesh(
		new SphereGeometry(1, 16, 12),
		new MeshStandardMaterial({ color, roughness: 0.7 }),
		count
	);
	const m = new Matrix4();
	const p = new Vector3();
	for (let k = 0; k < count; k++) {
		do p.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
		while (p.lengthSq() > 1);
		const size = 0.09 + 0.08 * rand();
		p.multiply(radii).add(centre);
		m.makeScale(size, size, size).setPosition(p);
		mesh.setMatrixAt(k, m);
	}
	return mesh;
}

export const ribosome: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	scene.add(root);
	root.add(lump(420, new Vector3(0.78, 0.55, 0.62), new Vector3(0, 0.2, 0), '#78aae6', 71));
	root.add(lump(240, new Vector3(0.62, 0.3, 0.48), new Vector3(0, -0.52, 0.05), '#f0c878', 72));

	const mrna = new CatmullRomCurve3(
		Array.from(
			{ length: 9 },
			(_, k) => new Vector3(-1.9 + k * 0.475, -0.25 + Math.sin(k * 1.3) * 0.05, 0.1 + Math.cos(k) * 0.1)
		)
	);
	root.add(
		new Mesh(new TubeGeometry(mrna, 120, 0.04, 8), new MeshStandardMaterial({ color: '#ff6b8b', roughness: 0.5 }))
	);

	const bead = new SphereGeometry(0.075, 16, 12);
	const chain = Array.from({ length: CHAIN }, (_, k) => {
		const m = new Mesh(bead, new MeshStandardMaterial({ color: BASE_COLORS[k % 4], roughness: 0.5 }));
		root.add(m);
		return m;
	});
	const exit = new Group();
	exit.position.set(0.3, 1.25, 0);
	root.add(exit);
	const labels: ModelLabel[] = [{ text: 'mRNA in → protein out', anchor: exit }];

	return {
		scene,
		extent: 1.6,
		ready: true,
		labels,
		update(t, spin) {
			root.rotation.y = spin + t * 0.1;
			chain.forEach((m, k) => {
				const s = k / CHAIN;
				m.position.set(0.1 + s * 0.4 + Math.sin(t + k * 0.6) * 0.06, 0.7 + s * 0.45, Math.cos(t * 0.8 + k) * 0.06);
			});
		},
		dispose: () => disposeTree(scene)
	};
};
