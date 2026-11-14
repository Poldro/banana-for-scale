import type { ModelKind } from '$lib/levels';

/**
 * Draws a 3D model into the 2D scene. Kept free of three.js so the renderer
 * does not pull the 3D bundle in; the implementation is loaded on demand.
 */
export interface ModelDrawer {
	/**
	 * Draws `kind` centred on the current origin with characteristic radius `r`
	 * (CSS px). Returns false when the model is not ready or too small, so the
	 * caller can fall back to the 2D picture.
	 */
	draw(ctx: CanvasRenderingContext2D, kind: ModelKind, r: number, t: number, spin: number): boolean;
	/** Starts loading a model's assets ahead of time. */
	preload(kind: ModelKind): void;
	dispose(): void;
}
