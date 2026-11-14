/**
 * Everest as a block of real terrain (SRTM elevation via Mapzen terrain tiles,
 * public domain), about 10 km across, standing on a plinth that reaches down
 * to sea level. No vertical exaggeration: this is how steep it really is.
 */
import {
	AmbientLight,
	BufferAttribute,
	BufferGeometry,
	Color,
	DirectionalLight,
	DoubleSide,
	Group,
	Mesh,
	MeshStandardMaterial,
	PlaneGeometry,
	Scene,
	Vector3
} from 'three';
import { disposeTree } from '../dispose';
import type { ModelFactory, ModelLabel } from '../types';

/** Must match EVEREST_RANGE in scripts/fetch-models.mjs: grey 0–255 → metres. */
const RANGE = [3000, 8900] as const;
/** Metres per pixel of the heightmap (zoom 12 tiles at 28° N). */
const METRES_PER_PIXEL = 33.75;
/** The stop's radius: half the summit's height above sea level. */
const UNIT = 4425;
const SNOW = new Color('#eef3fa');
const ROCK = new Color('#6d6a66');
const SCREE = new Color('#8b7d6b');
const PLINTH_TOP = new Color('#5d564e');
const PLINTH_BOTTOM = new Color('#2c2a28');

function readHeights(image: HTMLImageElement): {
	size: number;
	metres: Float32Array;
} {
	const size = image.naturalWidth;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('2D canvas not supported');
	ctx.drawImage(image, 0, 0);
	const data = ctx.getImageData(0, 0, size, size).data;
	const metres = new Float32Array(size * size);
	for (let k = 0; k < metres.length; k++) metres[k] = RANGE[0] + (data[k * 4] / 255) * (RANGE[1] - RANGE[0]);
	return { size, metres };
}

const toY = (m: number) => m / UNIT - 1;

function terrain(size: number, metres: Float32Array): { mesh: Mesh; edges: Vector3[][]; summit: Vector3 } {
	const width = (size * METRES_PER_PIXEL) / UNIT;
	const geometry = new PlaneGeometry(width, width, size - 1, size - 1);
	geometry.rotateX(-Math.PI / 2);
	const pos = geometry.attributes.position;
	const summit = new Vector3(0, -Infinity, 0);
	for (let k = 0; k < pos.count; k++) {
		const y = toY(metres[k]);
		pos.setY(k, y);
		if (y > summit.y) summit.set(pos.getX(k), y, pos.getZ(k));
	}
	geometry.computeVertexNormals();
	const normals = geometry.attributes.normal;
	const colors = new Float32Array(pos.count * 3);
	const c = new Color();
	for (let k = 0; k < pos.count; k++) {
		const m = metres[k];
		const flat = normals.getY(k);
		// Snow clings above ~5,500 m wherever the slope lets it.
		const snow = Math.min(1, Math.max(0, (m - 5300) / 900)) * Math.min(1, Math.max(0, (flat - 0.55) / 0.2));
		c.copy(m < 5200 ? SCREE : ROCK).lerp(SNOW, snow);
		colors.set([c.r, c.g, c.b], k * 3);
	}
	geometry.setAttribute('color', new BufferAttribute(colors, 3));
	const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));

	const at = (i: number, j: number) =>
		new Vector3(pos.getX(j * size + i), pos.getY(j * size + i), pos.getZ(j * size + i));
	const line = (f: (k: number) => Vector3) => Array.from({ length: size }, (_, k) => f(k));
	const edges = [
		line((k) => at(k, 0)),
		line((k) => at(size - 1, k)),
		line((k) => at(size - 1 - k, size - 1)),
		line((k) => at(0, size - 1 - k))
	];
	return { mesh, edges, summit };
}

/** Walls from the terrain's edge down to sea level. */
function plinth(edges: Vector3[][]): Mesh {
	const positions: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	const bottom = toY(0);
	for (const edge of edges) {
		const start = positions.length / 3;
		for (const p of edge) {
			positions.push(p.x, p.y, p.z, p.x, bottom, p.z);
			colors.push(PLINTH_TOP.r, PLINTH_TOP.g, PLINTH_TOP.b, PLINTH_BOTTOM.r, PLINTH_BOTTOM.g, PLINTH_BOTTOM.b);
		}
		for (let k = 0; k < edge.length - 1; k++) {
			const a = start + k * 2;
			indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return new Mesh(
		geometry,
		new MeshStandardMaterial({
			vertexColors: true,
			roughness: 1,
			side: DoubleSide,
			// Keeps the wall facing away from the sun from going black.
			emissive: '#2a241e'
		})
	);
}

export const everest: ModelFactory = ({ base }) => {
	const scene = new Scene();
	scene.add(new AmbientLight('#dfe8ff', 0.5));
	const sun = new DirectionalLight('#fff3e0', 2.4);
	sun.position.set(-2, 2.2, 1.2);
	scene.add(sun);

	const view = new Group();
	view.rotation.x = 0.42;
	scene.add(view);
	const pivot = new Group();
	view.add(pivot);
	const summitAnchor = new Group();
	const seaLevel = new Group();
	const labels: ModelLabel[] = [
		{ text: 'summit 8,849 m', anchor: summitAnchor },
		{ text: 'sea level', anchor: seaLevel }
	];
	let ready = false;

	const image = new Image();
	image.onload = () => {
		const { size, metres } = readHeights(image);
		const { mesh, edges, summit } = terrain(size, metres);
		pivot.add(mesh, plinth(edges));
		summitAnchor.position.copy(summit).add(new Vector3(0, 0.05, 0));
		const corner = edges[2][0];
		seaLevel.position.set(corner.x, toY(0), corner.z);
		pivot.add(summitAnchor, seaLevel);
		ready = true;
	};
	image.onerror = () => console.warn('banana-for-scale: could not load the Everest heightmap');
	image.src = `${base}/textures/everest.webp`;

	return {
		scene,
		extent: 1.65,
		get ready() {
			return ready;
		},
		labels,
		update(t, spin) {
			pivot.rotation.y = spin + 0.6 + Math.sin(t * 0.1) * 0.25;
		},
		dispose: () => disposeTree(scene)
	};
};
