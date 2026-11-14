/**
 * SARS-CoV-2: a lipid envelope about 100 nm across studded with spike
 * proteins, the keys it uses to enter cells. Spike count and shape follow
 * cryo-EM studies (roughly 25–40 spikes per particle).
 */
import {
	ConeGeometry,
	CylinderGeometry,
	Group,
	IcosahedronGeometry,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Scene,
	SphereGeometry,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { fibonacciSphere, seeded } from '../kit';
import type { ModelFactory } from '../types';

const ENVELOPE = 0.74;
const SPIKES = 36;
const BUMPS = 160;

/** Instances `geometry` on the sphere along each direction in `dirs`. */
function scatter(
	geometry: ConstructorParameters<typeof InstancedMesh>[0],
	material: MeshStandardMaterial,
	dirs: Array<[number, number, number]>,
	place: (dir: Vector3, k: number) => { at: number; scale: number }
): InstancedMesh {
	const mesh = new InstancedMesh(geometry, material, dirs.length);
	const m = new Matrix4();
	const q = new Quaternion();
	const up = new Vector3(0, 1, 0);
	const dir = new Vector3();
	dirs.forEach((d, k) => {
		dir.set(...d).normalize();
		const { at, scale } = place(dir, k);
		q.setFromUnitVectors(up, dir);
		m.compose(dir.clone().multiplyScalar(at), q, new Vector3(scale, scale, scale));
		mesh.setMatrixAt(k, m);
	});
	return mesh;
}

export const virus: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	scene.add(root);
	const rand = seeded(19);

	const envelope = new IcosahedronGeometry(ENVELOPE, 12);
	const pos = envelope.attributes.position;
	const v = new Vector3();
	for (let k = 0; k < pos.count; k++) {
		v.fromBufferAttribute(pos, k);
		const n = Math.sin(v.x * 17) * Math.sin(v.y * 19) * Math.sin(v.z * 23);
		v.multiplyScalar(1 + n * 0.015);
		pos.setXYZ(k, v.x, v.y, v.z);
	}
	envelope.computeVertexNormals();
	root.add(new Mesh(envelope, new MeshStandardMaterial({ color: '#8f97a3', roughness: 0.8 })));

	// Spikes: a thin stalk topped by a club-shaped crown, jittered off a lattice.
	const spikeDirs = fibonacciSphere(SPIKES).map(
		([x, y, z]) =>
			[x + (rand() - 0.5) * 0.25, y + (rand() - 0.5) * 0.25, z + (rand() - 0.5) * 0.25] as [number, number, number]
	);
	const red = new MeshStandardMaterial({ color: '#d8343f', roughness: 0.55 });
	const stalk = new CylinderGeometry(0.018, 0.022, 0.14, 8);
	stalk.translate(0, 0.07, 0);
	const crown = new ConeGeometry(0.075, 0.16, 12);
	crown.rotateX(Math.PI);
	crown.translate(0, 0.2, 0);
	const sizes = spikeDirs.map(() => 0.85 + rand() * 0.3);
	root.add(
		scatter(stalk, red, spikeDirs, (_, k) => ({
			at: ENVELOPE - 0.01,
			scale: sizes[k]
		}))
	);
	root.add(
		scatter(crown, red, spikeDirs, (_, k) => ({
			at: ENVELOPE - 0.01,
			scale: sizes[k]
		}))
	);

	// Smaller membrane (M) and envelope (E) proteins.
	const bumpDirs = fibonacciSphere(BUMPS).map(
		([x, y, z]) => [x + rand() * 0.3, y + rand() * 0.3, z + rand() * 0.3] as [number, number, number]
	);
	root.add(
		scatter(
			new SphereGeometry(0.03, 8, 6),
			new MeshStandardMaterial({ color: '#e0a23c', roughness: 0.6 }),
			bumpDirs,
			() => ({
				at: ENVELOPE,
				scale: 0.7 + rand() * 0.6
			})
		)
	);

	return {
		scene,
		extent: 1.12,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin + t * 0.12;
			root.rotation.x = Math.sin(t * 0.17) * 0.25;
		},
		dispose: () => disposeTree(scene)
	};
};
