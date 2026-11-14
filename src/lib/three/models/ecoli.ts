/**
 * E. coli: a rod about 2 µm long, covered in short pili and driven by a few
 * long corkscrew flagella that spin like propellers (shown much shorter than
 * their real 5–10 µm).
 */
import {
	CapsuleGeometry,
	Curve,
	Group,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Scene,
	SphereGeometry,
	TubeGeometry,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { seeded } from '../kit';
import type { ModelFactory } from '../types';

const RADIUS = 0.27;
const BODY = 1.46;
const PILI = 220;

/** A corkscrew along +x. */
class Helix extends Curve<Vector3> {
	constructor(
		private readonly length: number,
		private readonly radius: number,
		private readonly turns: number
	) {
		super();
	}
	getPoint(s: number, target = new Vector3()): Vector3 {
		const a = s * this.turns * Math.PI * 2;
		return target.set(
			s * this.length,
			Math.cos(a) * this.radius * Math.min(1, s * 6),
			Math.sin(a) * this.radius * Math.min(1, s * 6)
		);
	}
}

/** Where a point on the capsule's surface is, with its outward normal. */
function surfacePoint(rand: () => number): { at: Vector3; normal: Vector3 } {
	const half = (BODY - RADIUS * 2) / 2;
	const a = rand() * Math.PI * 2;
	const x = (rand() * 2 - 1) * (half + RADIUS * 0.8);
	const capX = Math.max(-half, Math.min(half, x));
	const off = x - capX;
	const ring = Math.sqrt(Math.max(0, RADIUS * RADIUS - off * off));
	const at = new Vector3(x, Math.cos(a) * ring, Math.sin(a) * ring);
	return {
		at,
		normal: at
			.clone()
			.sub(new Vector3(capX, 0, 0))
			.normalize()
	};
}

export const ecoli: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	root.rotation.z = 0.2;
	scene.add(root);
	const rand = seeded(57);

	const body = new CapsuleGeometry(RADIUS, BODY - RADIUS * 2, 16, 32);
	body.rotateZ(Math.PI / 2);
	root.add(new Mesh(body, new MeshStandardMaterial({ color: '#7fbf6a', roughness: 0.6 })));

	const pili = new InstancedMesh(
		new SphereGeometry(1, 6, 4),
		new MeshStandardMaterial({ color: '#cfe3b8', roughness: 0.8 }),
		PILI
	);
	const m = new Matrix4();
	const q = new Quaternion();
	const up = new Vector3(0, 1, 0);
	for (let k = 0; k < PILI; k++) {
		const { at, normal } = surfacePoint(rand);
		q.setFromUnitVectors(up, normal);
		const length = 0.04 + rand() * 0.05;
		m.compose(at.addScaledVector(normal, length * 0.5), q, new Vector3(0.006, length, 0.006));
		pili.setMatrixAt(k, m);
	}
	root.add(pili);

	const flagellumMaterial = new MeshStandardMaterial({
		color: '#e7efd8',
		roughness: 0.5
	});
	const flagella = [0.4, 2.3, 4.2].map((angle, k) => {
		const holder = new Group();
		holder.position.set(BODY / 2 - 0.15 - k * 0.12, Math.cos(angle) * RADIUS * 0.9, Math.sin(angle) * RADIUS * 0.9);
		holder.rotation.set(angle, 0, -0.25 + k * 0.2);
		const spinner = new Mesh(new TubeGeometry(new Helix(1.3 + k * 0.15, 0.05, 6), 200, 0.012, 6), flagellumMaterial);
		holder.add(spinner);
		root.add(holder);
		return spinner;
	});

	return {
		scene,
		extent: 1.6,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin + Math.sin(t * 0.15) * 0.5;
			for (const f of flagella) f.rotation.x = t * 6;
		},
		dispose: () => disposeTree(scene)
	};
};
