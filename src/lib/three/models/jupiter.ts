/**
 * Jupiter from the Cassini cylindrical map (NASA/JPL/SSI, public domain). It
 * spins in under ten hours, so fast it bulges: 7% wider than it is tall.
 */
import { AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, Scene, SphereGeometry } from 'three';
import { disposeTree } from '../dispose';
import { loadTexture } from '../kit';
import type { ModelFactory } from '../types';

const OBLATENESS = 0.935;
const AXIAL_TILT = (3.1 * Math.PI) / 180;
/** Starts with the Great Red Spot facing the viewer. */
const START_ROTATION = -0.75;
const SPIN_RATE = 0.12;

export const jupiter: ModelFactory = ({ base, renderer }) => {
	const scene = new Scene();
	scene.add(new AmbientLight('#ffffff', 0.15));
	const sun = new DirectionalLight('#ffffff', 2.6);
	sun.position.set(-0.8, 0.3, 2);
	scene.add(sun);

	let ready = false;
	const map = loadTexture(`${base}/textures/jupiter.webp`, renderer, () => (ready = true));
	const tilt = new Group();
	tilt.rotation.z = AXIAL_TILT;
	tilt.scale.y = OBLATENESS;
	scene.add(tilt);
	const globe = new Mesh(new SphereGeometry(1, 96, 64), new MeshStandardMaterial({ map, roughness: 1 }));
	tilt.add(globe);

	return {
		scene,
		extent: 1.04,
		get ready() {
			return ready;
		},
		update(t, spin) {
			globe.rotation.y = START_ROTATION + t * SPIN_RATE + spin;
		},
		dispose() {
			disposeTree(scene);
			map.dispose();
		}
	};
};
