/**
 * A proton: two up quarks and one down quark held by gluons, in a haze of
 * short-lived quark–antiquark pairs. The colours are "colour charge", not
 * real colours; the quarks have no measured size.
 */
import {
	BufferGeometry,
	Group,
	Line,
	LineBasicMaterial,
	Mesh,
	MeshBasicMaterial,
	Scene,
	SphereGeometry,
	type Sprite,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, rimMaterial, seeded } from '../kit';
import type { ModelFactory, ModelLabel } from '../types';

const QUARKS = [
	{ name: 'up', color: '#ff5a6e' },
	{ name: 'up', color: '#57e38b' },
	{ name: 'down', color: '#5aa2ff' }
];
const GLUON_STEPS = 60;
const SEA = 36;

export const proton: ModelFactory = () => {
	const scene = new Scene();
	const root = new Group();
	scene.add(root);
	root.add(
		new Mesh(new SphereGeometry(1, 64, 48), rimMaterial([1, 0.45, 0.35], { power: 2.5, strength: 0.6, bias: 0.05 }))
	);
	root.add(glowSprite('#ff7a5a', 2.2, 0.35));

	const core = new SphereGeometry(0.05, 16, 12);
	const quarks = QUARKS.map((q, i) => {
		const g = new Group();
		g.add(new Mesh(core, new MeshBasicMaterial({ color: '#ffffff' })));
		g.add(glowSprite(q.color, 0.55));
		root.add(g);
		return { group: g, i };
	});
	const labels: ModelLabel[] = quarks.map((q, i) => ({
		text: QUARKS[i].name,
		anchor: q.group
	}));

	const gluonMaterial = new LineBasicMaterial({
		color: '#ffd98c',
		transparent: true,
		opacity: 0.7
	});
	const gluons = QUARKS.map(() => {
		const geometry = new BufferGeometry().setFromPoints(Array.from({ length: GLUON_STEPS + 1 }, () => new Vector3()));
		root.add(new Line(geometry, gluonMaterial));
		return geometry;
	});

	const rand = seeded(5);
	const sea: Array<{ sprite: Sprite; rate: number; phase: number }> = Array.from({ length: SEA }, (_, k) => {
		const sprite = glowSprite(QUARKS[k % 3].color, 0.12, 0.6);
		const d = 0.3 + 0.6 * Math.cbrt(rand());
		const u = rand() * 2 - 1;
		const a = rand() * Math.PI * 2;
		const s = Math.sqrt(1 - u * u);
		sprite.position.set(Math.cos(a) * s * d, u * d, Math.sin(a) * s * d);
		root.add(sprite);
		return { sprite, rate: 2 + rand() * 4, phase: rand() * Math.PI * 2 };
	});

	const a = new Vector3();
	const b = new Vector3();
	const side = new Vector3();
	const up = new Vector3(0, 0, 1);
	return {
		scene,
		extent: 1.25,
		ready: true,
		labels,
		update(t, spin) {
			root.rotation.y = spin + t * 0.1;
			for (const q of quarks) {
				const angle = (q.i * Math.PI * 2) / 3 + Math.sin(t * 0.7 + q.i) * 0.4;
				const d = 0.45 + 0.1 * Math.sin(t * 1.3 + q.i * 2);
				q.group.position.set(Math.cos(angle) * d, Math.sin(angle) * d, Math.sin(t * 0.9 + q.i * 2.1) * 0.3);
			}
			gluons.forEach((geometry, i) => {
				a.copy(quarks[i].group.position);
				b.copy(quarks[(i + 1) % 3].group.position);
				side.subVectors(b, a).cross(up).normalize();
				const len = a.distanceTo(b);
				const pos = geometry.attributes.position;
				for (let s = 0; s <= GLUON_STEPS; s++) {
					const f = s / GLUON_STEPS;
					const wave = Math.sin(f * 18 + t * 6) * len * 0.05;
					pos.setXYZ(
						s,
						a.x + (b.x - a.x) * f + side.x * wave,
						a.y + (b.y - a.y) * f + side.y * wave,
						a.z + (b.z - a.z) * f + Math.cos(f * 18 + t * 6) * len * 0.05
					);
				}
				pos.needsUpdate = true;
			});
			for (const p of sea) p.sprite.material.opacity = 0.6 * Math.max(0, Math.sin(t * p.rate + p.phase));
		},
		dispose: () => disposeTree(scene)
	};
};
