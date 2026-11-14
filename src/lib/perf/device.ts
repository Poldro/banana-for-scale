/** Rendering budget for the current device. */
export interface DeviceProfile {
	/** Phones and small tablets: smaller renders, fewer points, fewer cached scenes. */
	readonly lowPower: boolean;
	/** Side of the shared WebGL canvas, in device pixels. */
	readonly maxRenderPx: number;
	/** Multiplier for point counts in particle models (0–1]. */
	readonly detail: number;
	/** 3D scenes kept alive at once; older ones are disposed. */
	readonly sceneCache: number;
	/** Decoded photos kept in memory at once. */
	readonly imageCache: number;
	/** Stops on each side of the current one whose 3D models are built ahead. */
	readonly modelPreload: number;
	/** Most 3D renders per frame; extra layers fall back to their 2D picture. */
	readonly rendersPerFrame: number;
}

export interface DeviceHints {
	readonly coarsePointer: boolean;
	readonly shortSide: number;
}

export function deviceProfile({ coarsePointer, shortSide }: DeviceHints): DeviceProfile {
	const lowPower = coarsePointer || shortSide < 700;
	return lowPower
		? { lowPower, maxRenderPx: 640, detail: 0.5, sceneCache: 4, imageCache: 8, modelPreload: 1, rendersPerFrame: 2 }
		: { lowPower, maxRenderPx: 1024, detail: 1, sceneCache: 6, imageCache: 12, modelPreload: 2, rendersPerFrame: 3 };
}

export function currentDevice(): DeviceProfile {
	return deviceProfile({
		coarsePointer: window.matchMedia('(pointer: coarse)').matches,
		shortSide: Math.min(window.screen.width, window.screen.height)
	});
}
