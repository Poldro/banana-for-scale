/** Side of the shared WebGL canvas that every model is rendered into. */
export const MAX_RENDER_PX = 1024;
/** Below this many device pixels a model is drawn in 2D instead. */
const MIN_RENDER_PX = 12;

/**
 * Device-pixel size of the square a model needs, given its on-screen radius
 * (CSS px), the padding factor around it and the device pixel ratio.
 */
export function renderPixels(radius: number, extent: number, dpr: number): number {
	// Tolerance so float noise (440.00000000000006) does not add a pixel.
	const px = Math.ceil(2 * radius * extent * dpr - 1e-9);
	if (px < MIN_RENDER_PX) return 0;
	return Math.min(px, MAX_RENDER_PX);
}
