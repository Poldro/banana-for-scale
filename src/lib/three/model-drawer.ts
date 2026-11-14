/**
 * Renders 3D models with one shared, off-screen WebGL canvas and copies each
 * render into the 2D scene, so models take part in the same layered zoom,
 * fades and scale references as photos. Loaded on demand (dynamic import).
 */
import { ACESFilmicToneMapping, OrthographicCamera, PMREMGenerator, Vector3, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ModelKind } from '$lib/levels';
import type { ModelDrawer } from '$lib/render/model-drawer';
import { label } from '$lib/render/generators';
import { atom } from './models/atom';
import { banana } from './models/banana';
import { burjKhalifa } from './models/burj-khalifa';
import { cmb } from './models/cmb';
import { cosmicWeb } from './models/cosmic-web';
import { dna } from './models/dna';
import { earth } from './models/earth';
import { ecoli } from './models/ecoli';
import { everest } from './models/everest';
import { foam } from './models/foam';
import { heliosphere } from './models/heliosphere';
import { jupiter } from './models/jupiter';
import { localGroup } from './models/local-group';
import { milkyWay } from './models/milky-way';
import { moon } from './models/moon';
import { nucleus } from './models/nucleus';
import { oort } from './models/oort';
import { pollen } from './models/pollen';
import { proton } from './models/proton';
import { rbc } from './models/rbc';
import { ribosome } from './models/ribosome';
import { saturnV } from './models/saturn-v';
import { sun } from './models/sun';
import { virus } from './models/virus';
import { innerOrbits, outerOrbits } from './models/orbits';
import { MAX_RENDER_PX, renderPixels } from './size';
import type { ModelContext, ModelFactory, ModelScene } from './types';

const FACTORIES: Readonly<Record<ModelKind, ModelFactory>> = {
	foam,
	proton,
	nucleus,
	atom,
	dna,
	ribosome,
	virus,
	ecoli,
	rbc,
	pollen,
	banana,
	'saturn-v': saturnV,
	'burj-khalifa': burjKhalifa,
	everest,
	moon,
	earth,
	jupiter,
	sun,
	'inner-orbits': innerOrbits,
	'outer-orbits': outerOrbits,
	heliosphere,
	oort,
	'milky-way': milkyWay,
	'local-group': localGroup,
	'cosmic-web': cosmicWeb,
	cmb
};

export function createModelDrawer(base: string): ModelDrawer {
	const canvas = document.createElement('canvas');
	const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
	renderer.setPixelRatio(1);
	renderer.setSize(MAX_RENDER_PX, MAX_RENDER_PX, false);
	renderer.setClearColor(0x000000, 0);
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.setScissorTest(true);

	const pmrem = new PMREMGenerator(renderer);
	const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	pmrem.dispose();

	const context: ModelContext = { base, renderer, environment };
	const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	camera.position.set(0, 0, 10);
	const scenes = new Map<ModelKind, ModelScene>();
	const anchor = new Vector3();
	let lost = false;
	canvas.addEventListener('webglcontextlost', () => (lost = true));

	function get(kind: ModelKind): ModelScene {
		const existing = scenes.get(kind);
		if (existing) return existing;
		const created = FACTORIES[kind](context);
		scenes.set(kind, created);
		return created;
	}

	return {
		preload: (kind) => void get(kind),
		draw(ctx, kind, r, t, spin) {
			if (lost) return false;
			const model = get(kind);
			if (!model.ready) return false;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const px = renderPixels(r, model.extent, dpr);
			if (px === 0) return false;

			model.update(t, spin, px / (2 * model.extent));
			const e = model.extent;
			camera.left = -e;
			camera.right = e;
			camera.top = e;
			camera.bottom = -e;
			camera.updateProjectionMatrix();
			renderer.setViewport(0, 0, px, px);
			renderer.setScissor(0, 0, px, px);
			renderer.clear();
			renderer.render(model.scene, camera);
			// WebGL's origin is bottom-left, so the render sits at the canvas bottom.
			const size = r * e;
			ctx.drawImage(canvas, 0, MAX_RENDER_PX - px, px, px, -size, -size, size * 2, size * 2);
			for (const l of model.labels ?? []) {
				if (!l.anchor.visible) continue;
				l.anchor.getWorldPosition(anchor).project(camera);
				label(ctx, l.text, anchor.x * size, -anchor.y * size - 12, r);
			}
			return true;
		},
		dispose() {
			for (const s of scenes.values()) s.dispose();
			scenes.clear();
			environment.dispose();
			renderer.dispose();
		}
	};
}
