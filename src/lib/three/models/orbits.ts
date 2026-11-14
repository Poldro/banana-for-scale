/** The planets' orbits in 3D, seen from slightly above the ecliptic. */
import { Group, Scene } from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory } from '../types';
import { PLANETS, solarSystem } from './solar';

/** Viewing angle above the ecliptic (rad); tilt enough to see inclinations. */
const VIEW_TILT = 0.42;

function orbitModel(
	names: readonly string[],
	au: number,
	dot: number,
	yearsPerSecond: number,
	extent: number
): ModelFactory {
	return () => {
		const scene = new Scene();
		const view = new Group();
		view.rotation.x = VIEW_TILT;
		scene.add(view);
		const system = solarSystem(
			PLANETS.filter((p) => names.includes(p.name)),
			1 / au,
			dot
		);
		view.add(system.group);
		return {
			scene,
			extent,
			ready: true,
			labels: system.labels,
			update(t, spin) {
				system.group.rotation.y = spin;
				system.update(t, yearsPerSecond);
			},
			dispose: () => disposeTree(scene)
		};
	};
}

/** Out to Mars; the stop's radius is 1 AU. */
export const innerOrbits = orbitModel(['Mercury', 'Venus', 'Earth', 'Mars'], 1, 0.025, 0.15, 1.75);

/** Out to Pluto; the stop's radius is Neptune's orbit. */
export const outerOrbits = orbitModel(
	PLANETS.map((p) => p.name),
	30.07,
	0.018,
	3,
	1.7
);
