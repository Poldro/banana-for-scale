import { CanvasTexture, SRGBColorSpace } from 'three';

let cached: CanvasTexture | undefined;

/** A soft white radial gradient, tinted per sprite, for glows and haloes. */
export function glowTexture(): CanvasTexture {
	if (cached) return cached;
	const size = 128;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas not supported');
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0, 'rgba(255,255,255,1)');
	g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
	g.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	cached = new CanvasTexture(canvas);
	cached.colorSpace = SRGBColorSpace;
	return cached;
}
