/**
 * The Milky Way as a barred spiral of points. The real galaxy has about 200
 * billion stars and nobody has seen it from outside: this follows the shape
 * astronomers have mapped from within.
 */
import { Group, Scene, Vector3 } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite } from '../kit';
import { pointBuffer, pointCloud, thinningGain } from '../points';
import type { ModelFactory, ModelLabel } from '../types';
import { addSpiral } from './galaxy';

/** The Sun sits about 26,000 light-years out; the stop's radius is 50,000. */
const SUN_DISTANCE = 0.52;

export const milkyWay: ModelFactory = ({ detail }) => {
	const scene = new Scene();
	const view = new Group();
	view.rotation.x = 0.55;
	scene.add(view);
	const disc = new Group();
	view.add(disc);

	const buffer = pointBuffer();
	addSpiral(buffer, {
		centre: new Vector3(),
		radius: 1,
		count: Math.round(22000 * detail),
		seed: 7,
		arms: 4,
		grain: 0.01
	});
	const stars = pointCloud(buffer.build(), 0.9, thinningGain(detail));
	disc.add(stars.points);
	disc.add(glowSprite('#ffd9a0', 0.7, 0.55));
	const sun = glowSprite('#fff2c8', 0.035);
	sun.position.set(-SUN_DISTANCE * 0.6, 0, SUN_DISTANCE * 0.8);
	disc.add(sun);
	const labels: ModelLabel[] = [{ text: 'Sun', anchor: sun }];

	return {
		scene,
		extent: 1.1,
		ready: true,
		labels,
		update(t, spin, pixelsPerUnit) {
			disc.rotation.y = spin + t * 0.015;
			stars.setScale(pixelsPerUnit);
		},
		dispose: () => disposeTree(scene)
	};
};
