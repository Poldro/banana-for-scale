/** Poly Haven's CC0 scanned banana (one fruit taken from the "Bananas" asset). */
import { Box3, DirectionalLight, Group, Scene, Sphere, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

/** Gentle back-and-forth sway (rad) so the fruit never sits edge-on by itself. */
const SWAY = 0.45;
/** Diagonal pose (rad): tip up to the right, stem down to the left. */
const TILT = 0.5;
/** Radius of the bounding sphere in model units; under `extent`, so no rotation clips it. */
const FIT = 0.98;

export const banana: ModelFactory = ({ base, environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const key = new DirectionalLight('#fff4dc', 1.6);
	key.position.set(-2, 3, 4);
	scene.add(key);

	const tilt = new Group();
	tilt.rotation.z = TILT;
	scene.add(tilt);
	const pivot = new Group();
	tilt.add(pivot);
	let ready = false;

	new GLTFLoader().load(`${base}/models/banana.glb`, (gltf) => {
		const fruit = gltf.scene;
		fruit.updateMatrixWorld(true);
		const box = new Box3().setFromObject(fruit);
		const bounds = box.getBoundingSphere(new Sphere());
		fruit.position.sub(bounds.center);
		// Scan lies along z; turn it across the screen (the tilt group adds the diagonal).
		const holder = new Group();
		holder.add(fruit);
		holder.rotation.set(0.35, Math.PI / 2, 0);
		holder.scale.setScalar(FIT / bounds.radius);
		pivot.add(holder);
		ready = true;
	});

	return {
		scene,
		extent: 1.05,
		get ready() {
			return ready;
		},
		update(t, spin) {
			pivot.rotation.y = spin + Math.sin(t * 0.4) * SWAY;
		},
		dispose: () => disposeTree(scene)
	};
};
