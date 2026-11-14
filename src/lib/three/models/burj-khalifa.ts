/**
 * Burj Khalifa, simplified: three wings around a central core in a Y plan,
 * each wing stepping back in turn as the tower rises in a spiral, topped by a
 * spire. 828 m tall; the setbacks are approximate.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Scene } from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';

/** The stop's radius is half the height: 414 m. */
const M = 1 / 414;
const TIERS = 27;
const TOWER_TOP = 585 * M;
const SPIRE_TOP = 828 * M;
const WING_WIDTH = 32 * M;
const WING_LENGTH = 75 * M;

export const burjKhalifa: ModelFactory = ({ environment }) => {
	const scene = new Scene();
	scene.environment = environment;
	const glass = new MeshStandardMaterial({
		color: '#b9c7d6',
		metalness: 0.85,
		roughness: 0.22
	});
	const steel = new MeshStandardMaterial({
		color: '#dfe5ec',
		metalness: 0.9,
		roughness: 0.3
	});
	const tower = new Group();
	tower.position.y = -1;
	scene.add(tower);

	const tierHeight = TOWER_TOP / TIERS;
	const box = new BoxGeometry(1, 1, 1);
	for (let k = 0; k < TIERS; k++) {
		for (let w = 0; w < 3; w++) {
			// Each wing loses a setback every third tier, offset per wing: the spiral.
			const steps = Math.floor((k + 3 - w) / 3);
			const length = WING_LENGTH * (1 - steps / 10);
			if (length <= WING_WIDTH * 0.3) continue;
			const wing = new Mesh(box, glass);
			const angle = (w * Math.PI * 2) / 3;
			wing.scale.set(length, tierHeight * 0.98, WING_WIDTH);
			wing.position.set(Math.cos(angle) * length * 0.5, tierHeight * (k + 0.5), -Math.sin(angle) * length * 0.5);
			wing.rotation.y = angle;
			tower.add(wing);
		}
	}
	const coreHeight = TOWER_TOP + 60 * M;
	const core = new Mesh(new CylinderGeometry(14 * M, 22 * M, coreHeight, 6), glass);
	core.position.y = coreHeight / 2;
	tower.add(core);
	const spire = new Mesh(new ConeGeometry(9 * M, SPIRE_TOP - coreHeight, 12), steel);
	spire.position.y = coreHeight + (SPIRE_TOP - coreHeight) / 2;
	tower.add(spire);
	const ground = new Mesh(
		new CylinderGeometry(0.42, 0.42, 0.01, 48),
		new MeshStandardMaterial({ color: '#3a4352', roughness: 1 })
	);
	tower.add(ground);

	return {
		scene,
		extent: 1.05,
		ready: true,
		update(t, spin) {
			tower.rotation.y = spin + t * 0.12;
		},
		dispose: () => disposeTree(scene)
	};
};
