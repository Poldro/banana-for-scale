/** Earth as a textured globe (NASA Blue Marble, public domain) with a thin atmosphere. */
import {
	AdditiveBlending,
	AmbientLight,
	BackSide,
	DirectionalLight,
	Group,
	Mesh,
	MeshStandardMaterial,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	SRGBColorSpace,
	TextureLoader
} from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

const AXIAL_TILT = (23.4 * Math.PI) / 180;
/** Starting longitude so Africa faces the viewer, as in the Apollo 17 photo. */
const START_ROTATION = -Math.PI / 2 - 0.35;
const SPIN_RATE = 0.05;

const atmosphere = new ShaderMaterial({
	side: BackSide,
	blending: AdditiveBlending,
	transparent: true,
	depthWrite: false,
	vertexShader: /* glsl */ `
		varying vec3 vNormal;
		void main() {
			vNormal = normalize(normalMatrix * normal);
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}`,
	fragmentShader: /* glsl */ `
		varying vec3 vNormal;
		void main() {
			float rim = pow(clamp(0.72 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 4.0);
			gl_FragColor = vec4(0.35, 0.62, 1.0, 1.0) * rim;
		}`
});

export const earth: ModelFactory = ({ base, renderer }) => {
	const scene = new Scene();
	scene.add(new AmbientLight('#ffffff', 0.2));
	const sun = new DirectionalLight('#ffffff', 2.8);
	sun.position.set(-0.7, 0.4, 2);
	scene.add(sun);

	let ready = false;
	const map = new TextureLoader().load(`${base}/textures/earth.webp`, () => (ready = true));
	map.colorSpace = SRGBColorSpace;
	map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

	const tilt = new Group();
	tilt.rotation.z = AXIAL_TILT;
	scene.add(tilt);
	const globe = new Mesh(new SphereGeometry(1, 96, 64), new MeshStandardMaterial({ map, roughness: 0.9 }));
	tilt.add(globe);
	scene.add(new Mesh(new SphereGeometry(1.06, 64, 48), atmosphere));

	return {
		scene,
		extent: 1.12,
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
