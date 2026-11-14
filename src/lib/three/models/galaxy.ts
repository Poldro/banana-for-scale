/** Spiral galaxies made of soft points: a bar or bulge, arms, and a thin disc. */
import { Euler, Vector3 } from 'three';
import { seeded } from '../kit';
import type { pointBuffer } from '../points';

export interface SpiralOptions {
	readonly centre: Vector3;
	readonly radius: number;
	readonly count: number;
	readonly seed: number;
	/** Orientation of the disc (the disc lies in its local xz plane). */
	readonly tilt?: Euler;
	readonly arms?: number;
	/** Point diameter as a fraction of the radius. */
	readonly grain?: number;
}

type Buffer = ReturnType<typeof pointBuffer>;

const PITCH = Math.tan((13 * Math.PI) / 180);
const ARM_BLUE: readonly [number, number, number] = [0.62, 0.74, 1];
const CORE_GOLD: readonly [number, number, number] = [1, 0.82, 0.55];

/** Adds a spiral galaxy's stars to `buffer`. */
export function addSpiral(buffer: Buffer, o: SpiralOptions): void {
	const rand = seeded(o.seed);
	const arms = o.arms ?? 2;
	const grain = o.grain ?? 0.012;
	const v = new Vector3();
	const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
	for (let k = 0; k < o.count; k++) {
		const kind = rand();
		let x: number, y: number, z: number;
		let rgb = ARM_BLUE;
		let size = grain;
		if (kind < 0.22) {
			// Bulge and bar: a squashed, elongated core.
			const d = Math.pow(rand(), 1.8) * 0.28;
			const a = rand() * Math.PI * 2;
			x = Math.cos(a) * d * 1.6;
			z = Math.sin(a) * d * 0.7;
			y = gauss() * 0.06 * (1 - d * 2);
			rgb = CORE_GOLD;
			size = grain * 1.3;
		} else if (kind < 0.8) {
			// Logarithmic arms starting at the ends of the bar.
			const d = 0.18 + Math.pow(rand(), 0.8) * 0.85;
			const arm = Math.floor(rand() * arms);
			const a = Math.log(d / 0.18) / PITCH + (arm * Math.PI * 2) / arms + gauss() * 0.28;
			x = Math.cos(a) * d + gauss() * 0.03;
			z = Math.sin(a) * d + gauss() * 0.03;
			y = gauss() * 0.02;
			const warm = Math.min(1, 0.25 / d);
			rgb = [
				ARM_BLUE[0] + (CORE_GOLD[0] - ARM_BLUE[0]) * warm,
				ARM_BLUE[1] + (CORE_GOLD[1] - ARM_BLUE[1]) * warm,
				ARM_BLUE[2] + (CORE_GOLD[2] - ARM_BLUE[2]) * warm
			];
		} else {
			// Diffuse disc between the arms.
			const d = Math.sqrt(rand());
			const a = rand() * Math.PI * 2;
			x = Math.cos(a) * d;
			z = Math.sin(a) * d;
			y = gauss() * 0.025;
			rgb = [0.55, 0.58, 0.7];
			size = grain * 0.8;
		}
		const b = 0.35 + 0.65 * rand();
		v.set(x, y, z).multiplyScalar(o.radius);
		if (o.tilt) v.applyEuler(o.tilt);
		v.add(o.centre);
		buffer.add(v.x, v.y, v.z, [rgb[0] * b, rgb[1] * b, rgb[2] * b], size * o.radius);
	}
}
