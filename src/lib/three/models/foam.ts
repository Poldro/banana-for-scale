/**
 * Spacetime foam: at the Planck length, space itself may seethe. A rippling
 * sheet of space with bubbles that flicker in and out. Pure speculation made
 * visible — no experiment has reached this scale.
 */
import { AdditiveBlending, BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, type Sprite } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, seeded } from '../kit';
import type { ModelFactory } from '../types';

const SEGMENTS = 56;
const WAVES = 9;
const BUBBLES = 40;

export const foam: ModelFactory = () => {
	const scene = new Scene();
	const view = new Group();
	view.rotation.x = 0.9;
	scene.add(view);
	const root = new Group();
	view.add(root);

	const geometry = new PlaneGeometry(2.6, 2.6, SEGMENTS, SEGMENTS);
	geometry.rotateX(-Math.PI / 2);
	// Fade the sheet out towards its edge (black adds nothing when blending additively).
	const edge = geometry.attributes.position;
	const fade = new Float32Array(edge.count * 3);
	for (let k = 0; k < edge.count; k++) {
		const d = Math.hypot(edge.getX(k), edge.getZ(k)) / 1.3;
		const f = Math.max(0, 1 - d * d);
		fade.set([f, f, f], k * 3);
	}
	geometry.setAttribute('color', new BufferAttribute(fade, 3));
	const sheet = new Mesh(
		geometry,
		new MeshBasicMaterial({
			color: '#a58cff',
			vertexColors: true,
			wireframe: true,
			transparent: true,
			opacity: 0.35,
			blending: AdditiveBlending,
			depthWrite: false
		})
	);
	root.add(sheet);
	const rest = Float32Array.from(geometry.attributes.position.array);

	const rand = seeded(11);
	const waves = Array.from({ length: WAVES }, () => ({
		kx: (rand() - 0.5) * 9,
		kz: (rand() - 0.5) * 9,
		speed: 0.6 + rand() * 1.6,
		phase: rand() * Math.PI * 2,
		amp: 0.03 + rand() * 0.05
	}));
	const bubbles: Array<{ sprite: Sprite; rate: number; phase: number }> = Array.from({ length: BUBBLES }, () => {
		const sprite = glowSprite('#b9a2ff', 0.1 + rand() * 0.25, 0.8);
		sprite.position.set((rand() - 0.5) * 2.2, (rand() - 0.5) * 0.5, (rand() - 0.5) * 2.2);
		root.add(sprite);
		return { sprite, rate: 1.5 + rand() * 3, phase: rand() * Math.PI * 2 };
	});
	const pos = geometry.attributes.position;

	return {
		scene,
		extent: 1.3,
		ready: true,
		update(t, spin) {
			root.rotation.y = spin + t * 0.05;
			for (let k = 0; k < pos.count; k++) {
				const x = rest[k * 3];
				const z = rest[k * 3 + 2];
				let y = 0;
				for (const w of waves) y += Math.sin(x * w.kx + z * w.kz + t * w.speed + w.phase) * w.amp;
				pos.setY(k, y);
			}
			pos.needsUpdate = true;
			for (const b of bubbles) {
				const pulse = Math.max(0, Math.sin(t * b.rate + b.phase));
				b.sprite.material.opacity = 0.8 * pulse;
			}
		},
		dispose: () => disposeTree(scene)
	};
};
