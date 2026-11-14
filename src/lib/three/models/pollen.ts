/**
 * Pollen grains, as in a scanning electron micrograph: a spiky sunflower-type
 * grain (to snag on insects) next to a smooth grain with three furrows.
 * Colours are false, like those of a colourised micrograph.
 */
import {
	ConeGeometry,
	Group,
	IcosahedronGeometry,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Scene,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { fibonacciSphere } from '../kit';
import type { ModelFactory } from '../types';

const SPIKES = 140;

function spiky(): Group {
	const grain = new Group();
	const surface = new IcosahedronGeometry(0.62, 10);
	const pos = surface.attributes.position;
	const v = new Vector3();
	for (let k = 0; k < pos.count; k++) {
		v.fromBufferAttribute(pos, k);
		v.multiplyScalar(1 + Math.sin(v.x * 40) * Math.sin(v.y * 40) * Math.sin(v.z * 40) * 0.02);
		pos.setXYZ(k, v.x, v.y, v.z);
	}
	surface.computeVertexNormals();
	const material = new MeshStandardMaterial({
		color: '#f2b84b',
		roughness: 0.75
	});
	grain.add(new Mesh(surface, material));
	const cone = new ConeGeometry(0.045, 0.2, 10);
	cone.translate(0, 0.1, 0);
	const spikes = new InstancedMesh(cone, material, SPIKES);
	const m = new Matrix4();
	const q = new Quaternion();
	const up = new Vector3(0, 1, 0);
	const one = new Vector3(1, 1, 1);
	fibonacciSphere(SPIKES).forEach(([x, y, z], k) => {
		const dir = new Vector3(x, y, z);
		q.setFromUnitVectors(up, dir);
		m.compose(dir.multiplyScalar(0.6), q, one);
		spikes.setMatrixAt(k, m);
	});
	grain.add(spikes);
	return grain;
}

/** An ellipsoid with three deep furrows (colpi) running pole to pole. */
function furrowed(): Mesh {
	const geometry = new IcosahedronGeometry(1, 12);
	const pos = geometry.attributes.position;
	const v = new Vector3();
	for (let k = 0; k < pos.count; k++) {
		v.fromBufferAttribute(pos, k);
		const angle = Math.atan2(v.z, v.x);
		const furrow = Math.pow(Math.max(0, Math.cos(angle * 3)), 40) * (1 - Math.abs(v.y) * 0.8);
		const pits = Math.sin(v.x * 30) * Math.sin(v.y * 30) * Math.sin(v.z * 30) * 0.015;
		v.multiplyScalar(1 - furrow * 0.18 + pits);
		pos.setXYZ(k, v.x * 0.36, v.y * 0.48, v.z * 0.36);
	}
	geometry.computeVertexNormals();
	return new Mesh(geometry, new MeshStandardMaterial({ color: '#8fcf7a', roughness: 0.7 }));
}

export const pollen: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const root = new Group();
	scene.add(root);
	const big = spiky();
	big.position.set(-0.22, 0.05, 0);
	root.add(big);
	const small = furrowed();
	small.position.set(0.78, -0.35, -0.3);
	small.rotation.z = 0.5;
	root.add(small);

	return {
		scene,
		extent: 1.2,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin * 0.5;
			big.rotation.y = spin + t * 0.1;
			small.rotation.y = -t * 0.15 + spin;
		},
		dispose: () => disposeTree(scene)
	};
};
