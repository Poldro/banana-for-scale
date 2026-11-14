/**
 * One full turn of B-DNA at true proportions: 2 nm wide, 3.4 nm per turn,
 * ten base pairs, with the minor and major grooves of the real molecule.
 */
import {
	CatmullRomCurve3,
	CylinderGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Scene,
	SphereGeometry,
	TubeGeometry,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

/** In units of the helix radius (1 nm). */
const RISE_PER_TURN = 3.4;
const BASE_PAIRS = 10;
/** Angle between the two strands; ≠ π gives the minor/major grooves. */
const GROOVE = 2.4;
const BACKBONE_RADIUS = 0.07;
const PAIRS: ReadonlyArray<readonly [string, string]> = [
	['#ff7a59', '#06d6a0'],
	['#ffd166', '#4cc9f0'],
	['#06d6a0', '#ff7a59'],
	['#4cc9f0', '#ffd166']
];

function helixPoint(angle: number, y: number, radius = 1): Vector3 {
	return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

function strand(offset: number): CatmullRomCurve3 {
	const steps = 80;
	const points = Array.from({ length: steps + 1 }, (_, i) => {
		const f = i / steps;
		return helixPoint(f * Math.PI * 2 + offset, (f - 0.5) * RISE_PER_TURN);
	});
	return new CatmullRomCurve3(points);
}

/** A cylinder from a to b. */
function rod(a: Vector3, b: Vector3, radius: number, material: MeshStandardMaterial): Mesh {
	const length = a.distanceTo(b);
	const mesh = new Mesh(new CylinderGeometry(radius, radius, length, 10), material);
	mesh.position.copy(a).add(b).multiplyScalar(0.5);
	mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()));
	return mesh;
}

export const dna: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	// Upright like the 2D version; a slight lean keeps both ends inside the view.
	const tilt = new Group();
	tilt.rotation.z = 0.12;
	scene.add(tilt);
	const helix = new Group();
	tilt.add(helix);

	const backbones = [
		new MeshStandardMaterial({ color: '#9db4ff', roughness: 0.35 }),
		new MeshStandardMaterial({ color: '#ffb48a', roughness: 0.35 })
	];
	[0, GROOVE].forEach((offset, i) => {
		helix.add(new Mesh(new TubeGeometry(strand(offset), 160, BACKBONE_RADIUS, 12), backbones[i]));
	});

	const phosphate = new SphereGeometry(0.11, 16, 12);
	const baseMaterials = new Map<string, MeshStandardMaterial>();
	const base = (color: string) => {
		const existing = baseMaterials.get(color);
		if (existing) return existing;
		const m = new MeshStandardMaterial({ color, roughness: 0.5 });
		baseMaterials.set(color, m);
		return m;
	};
	for (let i = 0; i < BASE_PAIRS; i++) {
		const f = (i + 0.5) / BASE_PAIRS;
		const angle = f * Math.PI * 2;
		const y = (f - 0.5) * RISE_PER_TURN;
		const a = helixPoint(angle, y, 0.92);
		const b = helixPoint(angle + GROOVE, y, 0.92);
		const mid = a.clone().add(b).multiplyScalar(0.5);
		const [ca, cb] = PAIRS[i % PAIRS.length];
		helix.add(rod(a, mid, 0.05, base(ca)), rod(mid, b, 0.05, base(cb)));
		const pa = new Mesh(phosphate, backbones[0]);
		pa.position.copy(helixPoint(angle, y));
		const pb = new Mesh(phosphate, backbones[1]);
		pb.position.copy(helixPoint(angle + GROOVE, y));
		helix.add(pa, pb);
	}

	return {
		scene,
		extent: 1.9,
		ready: true,
		update(t, spin) {
			helix.rotation.y = spin + t * 0.25;
		},
		dispose: () => disposeTree(scene)
	};
};
