/**
 * Potassium as a 3D Bohr-style sketch: 19 electrons on tilted orbits in four
 * shells (2, 8, 8, 1) around a nucleus too small to see. A cartoon, like the
 * 2D version: real electrons are probability clouds, not little planets.
 */
import {
	AdditiveBlending,
	BufferGeometry,
	Group,
	LineBasicMaterial,
	LineLoop,
	Mesh,
	MeshBasicMaterial,
	Scene,
	SphereGeometry,
	Sprite,
	SpriteMaterial,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { glowTexture } from '../glow';
import { seeded } from '../kit';
import type { ModelFactory } from '../types';

const SHELLS = [2, 8, 8, 1];
const ORBIT_SEGMENTS = 96;

interface Electron {
	readonly holder: Group;
	readonly radius: number;
	readonly phase: number;
	readonly speed: number;
	readonly dot: Group;
}

export const atom: ModelFactory = () => {
	const scene = new Scene();
	const root = new Group();
	root.rotation.x = 0.35;
	scene.add(root);
	const rand = seeded(19);
	const orbitMaterial = new LineBasicMaterial({
		color: '#8fa8ff',
		transparent: true,
		opacity: 0.22
	});
	const electronMaterial = new MeshBasicMaterial({ color: '#cfe3ff' });
	const electronGeometry = new SphereGeometry(0.022, 12, 8);
	const glow = new SpriteMaterial({
		map: glowTexture(),
		color: '#6fa8ff',
		blending: AdditiveBlending,
		depthWrite: false
	});

	const nucleus = new Sprite(
		new SpriteMaterial({
			map: glowTexture(),
			color: '#ff8a7a',
			blending: AdditiveBlending,
			depthWrite: false
		})
	);
	nucleus.scale.setScalar(0.05);
	root.add(nucleus);

	const electrons: Electron[] = SHELLS.flatMap((count, shell) => {
		const radius = (shell + 1) / SHELLS.length;
		return Array.from({ length: count }, (_, i) => {
			const holder = new Group();
			holder.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
			const points = Array.from({ length: ORBIT_SEGMENTS }, (_, k) => {
				const a = (k / ORBIT_SEGMENTS) * Math.PI * 2;
				return new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
			});
			holder.add(new LineLoop(new BufferGeometry().setFromPoints(points), orbitMaterial));
			const dot = new Group();
			dot.add(new Mesh(electronGeometry, electronMaterial));
			const halo = new Sprite(glow);
			halo.scale.setScalar(0.14);
			dot.add(halo);
			holder.add(dot);
			root.add(holder);
			// Inner shells circle faster, as in the Bohr picture.
			return {
				holder,
				radius,
				dot,
				phase: (i / count) * Math.PI * 2 + rand(),
				speed: 0.9 / Math.sqrt(radius)
			};
		});
	});

	return {
		scene,
		extent: 1.12,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin + t * 0.08;
			for (const e of electrons) {
				const a = e.phase + t * e.speed;
				e.dot.position.set(Math.cos(a) * e.radius, Math.sin(a) * e.radius, 0);
			}
		},
		dispose() {
			disposeTree(scene);
			glow.dispose();
		}
	};
};
