import type { Object3D, Scene, Texture, WebGLRenderer } from 'three';

/** A name drawn in 2D next to a point of the model, like the 2D diagrams do. */
export interface ModelLabel {
	readonly text: string;
	readonly anchor: Object3D;
}

export interface ModelScene {
	readonly scene: Scene;
	/** Half-size of the view in model units; the stop's characteristic radius is 1. */
	readonly extent: number;
	/** False until textures or meshes have loaded. */
	readonly ready: boolean;
	readonly labels?: readonly ModelLabel[];
	/**
	 * Poses the model for time `t` (s) and user rotation `spin` (rad).
	 * `pixelsPerUnit` is the render scale, for things sized in screen pixels.
	 */
	update(t: number, spin: number, pixelsPerUnit: number): void;
	dispose(): void;
}

export interface ModelContext {
	/** Base path of the app, for loading files from static/. */
	readonly base: string;
	readonly renderer: WebGLRenderer;
	/** Neutral studio lighting for physically based materials. */
	readonly environment: Texture;
}

export type ModelFactory = (ctx: ModelContext) => ModelScene;
