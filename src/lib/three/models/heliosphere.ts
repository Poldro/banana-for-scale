/**
 * The heliosphere: the bubble the solar wind blows in interstellar gas, blunt
 * on the side the Sun travels towards and trailing a long tail. Both Voyagers
 * have crossed its edge. The shape is a sketch; nobody has seen the tail.
 */
import { DoubleSide, Group, Mesh, Scene, SphereGeometry, Vector3 } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, rimMaterial } from '../kit';
import type { ModelFactory, ModelLabel } from '../types';
import { PLANETS, solarSystem } from './solar';

/** The stop's radius, in AU (roughly the heliopause nose). */
const RADIUS_AU = 120;
const SHOCK_AU = 90;
const DEG = Math.PI / 180;

/** Stretches a sphere into a comet-like bubble: nose at −x, tail towards +x. */
function bubble(radius: number, tail: number): SphereGeometry {
	const geometry = new SphereGeometry(radius, 96, 64);
	const pos = geometry.attributes.position;
	const v = new Vector3();
	for (let k = 0; k < pos.count; k++) {
		v.fromBufferAttribute(pos, k);
		if (v.x > 0) {
			const s = v.x / radius;
			v.x *= 1 + tail * s * s;
			const pinch = 1 - 0.25 * s * s;
			v.y *= pinch;
			v.z *= pinch;
		}
		pos.setXYZ(k, v.x, v.y, v.z);
	}
	geometry.computeVertexNormals();
	return geometry;
}

/** Direction (ecliptic longitude, latitude in degrees) and distance (AU) in 2026. */
const VOYAGERS = [
	{ name: 'Voyager 1', lon: 255, lat: 35, au: 170 },
	{ name: 'Voyager 2', lon: 290, lat: -33, au: 143 }
];

export const heliosphere: ModelFactory = () => {
	const scene = new Scene();
	const view = new Group();
	view.rotation.x = 0.35;
	scene.add(view);
	const root = new Group();
	view.add(root);

	const unit = 1 / RADIUS_AU;
	const heliopause = new Mesh(bubble(1, 2.2), rimMaterial([0.35, 0.55, 1], { power: 2.2, strength: 0.7, bias: 0.04 }));
	heliopause.position.x = 0.15;
	root.add(heliopause);
	const shock = new Mesh(
		new SphereGeometry(SHOCK_AU * unit, 64, 48),
		rimMaterial([0.55, 0.8, 1], { power: 3, strength: 0.6, side: DoubleSide })
	);
	root.add(shock);
	const system = solarSystem(PLANETS.slice(4, 8), unit, 0.008, false);
	root.add(system.group);

	// The nose of the bubble points the way the Sun moves, roughly towards the Voyagers.
	const labels: ModelLabel[] = [];
	for (const v of VOYAGERS) {
		const craft = glowSprite('#ffffff', 0.06);
		const lon = (v.lon - 180) * DEG;
		const lat = v.lat * DEG;
		craft.position
			.set(-Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
			.multiplyScalar(v.au * unit);
		root.add(craft);
		labels.push({ text: v.name, anchor: craft });
	}
	const shockLabel = new Group();
	shockLabel.position.set(0, -SHOCK_AU * unit - 0.08, 0);
	root.add(shockLabel);
	labels.push({ text: 'termination shock', anchor: shockLabel });

	return {
		scene,
		extent: 1.9,
		ready: true,
		labels,
		update(t, spin) {
			root.rotation.y = spin + 0.5 + t * 0.03;
			system.update(t, 3);
		},
		dispose: () => disposeTree(scene)
	};
};
