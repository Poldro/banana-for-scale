/**
 * The observable universe as the sphere of the cosmic microwave background,
 * the oldest light there is (Planck map, ESA, public domain). A wedge is cut
 * away (one octant) to show where we are: at the centre, as every observer is.
 */
import { BackSide, FrontSide, Group, Mesh, MeshBasicMaterial, Scene, SphereGeometry } from 'three';
import { disposeTree } from '../dispose';
import { glowSprite, loadTexture } from '../kit';
import type { ModelFactory, ModelLabel } from '../types';

const WEDGE = Math.PI / 2;
/** Turns the open octant towards the viewer, slightly from the side. */
const START_ROTATION = Math.PI / 4 - 0.35;

export const cmb: ModelFactory = ({ base, renderer }) => {
	const scene = new Scene();
	const view = new Group();
	view.rotation.x = 0.45;
	scene.add(view);
	const root = new Group();
	view.add(root);

	let ready = false;
	const map = loadTexture(`${base}/textures/cmb.webp`, renderer, () => (ready = true));
	// Outside at full brightness, inside dimmed so the cut reads as a cut.
	const outside = new MeshBasicMaterial({ map, side: FrontSide });
	const inside = new MeshBasicMaterial({ map, side: BackSide, color: '#3a3f4a' });
	const parts = [
		new SphereGeometry(1, 96, 64, WEDGE, Math.PI * 2 - WEDGE),
		// Lower half of the wedge, so only the upper octant is missing.
		new SphereGeometry(1, 24, 32, 0, WEDGE, Math.PI / 2, Math.PI / 2)
	];
	for (const geometry of parts) {
		root.add(new Mesh(geometry, outside), new Mesh(geometry, inside));
	}
	const here = glowSprite('#fff4d0', 0.08);
	root.add(here);
	const labels: ModelLabel[] = [{ text: 'you are here', anchor: here }];

	return {
		scene,
		extent: 1.08,
		get ready() {
			return ready;
		},
		labels,
		update(t, spin) {
			root.rotation.y = spin + START_ROTATION + Math.sin(t * 0.2) * 0.15;
		},
		dispose() {
			disposeTree(scene);
			map.dispose();
		}
	};
};
