/**
 * The Moon from NASA's LRO maps (public domain): colour plus a relief map for
 * crater shading. It is tidally locked, so it only turns when you turn it.
 */
import { AmbientLight, DirectionalLight, Mesh, MeshStandardMaterial, Scene, SphereGeometry } from 'three';
import { disposeTree } from '../dispose';
import { loadTexture } from '../kit';
import type { ModelFactory } from '../types';

/** Puts longitude 0 (the near side's centre) towards the viewer. */
const NEAR_SIDE = -Math.PI / 2;

export const moon: ModelFactory = ({ base, renderer }) => {
	const scene = new Scene();
	scene.add(new AmbientLight('#ffffff', 0.12));
	const sun = new DirectionalLight('#ffffff', 2.6);
	sun.position.set(-1.2, 0.3, 1.6);
	scene.add(sun);

	let loaded = 0;
	const onLoad = () => loaded++;
	const map = loadTexture(`${base}/textures/moon.webp`, renderer, onLoad);
	const bumpMap = loadTexture(`${base}/textures/moon-relief.webp`, renderer, onLoad, false);
	const globe = new Mesh(
		new SphereGeometry(1, 128, 96),
		new MeshStandardMaterial({
			map,
			bumpMap,
			bumpScale: 2.5,
			roughness: 1,
			metalness: 0
		})
	);
	scene.add(globe);

	return {
		scene,
		extent: 1.04,
		get ready() {
			return loaded === 2;
		},
		update(t, spin) {
			// A slow libration-like nod, as seen from Earth over a month.
			globe.rotation.y = NEAR_SIDE + spin + Math.sin(t * 0.2) * 0.12;
			globe.rotation.x = Math.sin(t * 0.13) * 0.08;
		},
		dispose() {
			disposeTree(scene);
			map.dispose();
			bumpMap.dispose();
		}
	};
};
