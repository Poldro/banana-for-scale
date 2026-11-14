/** NASA's Saturn V model (NASA 3D Resources, public domain), standing on its fins. */
import { Box3, DirectionalLight, Group, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

export const saturnV: ModelFactory = ({ base, environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const key = new DirectionalLight('#ffffff', 1.4);
	key.position.set(-3, 2, 4);
	scene.add(key);

	const tilt = new Group();
	tilt.rotation.z = -0.12;
	scene.add(tilt);
	const pivot = new Group();
	tilt.add(pivot);
	let ready = false;

	new GLTFLoader().load(
		`${base}/models/saturn-v.glb`,
		(gltf) => {
			const rocket = gltf.scene;
			rocket.updateMatrixWorld(true);
			const box = new Box3().setFromObject(rocket);
			const size = box.getSize(new Vector3());
			rocket.position.sub(box.getCenter(new Vector3()));
			const holder = new Group();
			holder.add(rocket);
			// The stop's radius is half the rocket's height.
			holder.scale.setScalar(2 / size.y);
			pivot.add(holder);
			ready = true;
		},
		undefined,
		() => console.warn('banana-for-scale: could not load the Saturn V model')
	);

	return {
		scene,
		extent: 1.05,
		get ready() {
			return ready;
		},
		update(t, spin) {
			pivot.rotation.y = spin + t * 0.15;
		},
		dispose: () => disposeTree(scene)
	};
};
