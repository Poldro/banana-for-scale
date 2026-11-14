/**
 * Soft, glowing points sized in model units (so they grow as you zoom in),
 * never smaller than one pixel. Used for stars, galaxies and comets.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';

export interface PointCloud {
	readonly points: Points;
	/** Call every frame with the render scale. */
	setScale(pixelsPerUnit: number): void;
}

export interface PointData {
	/** xyz per point. */
	readonly positions: Float32Array;
	/** Linear rgb per point. */
	readonly colors: Float32Array;
	/** Diameter per point, in model units. */
	readonly sizes: Float32Array;
}

export function pointCloud({ positions, colors, sizes }: PointData, minPixels = 1.2): PointCloud {
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(positions, 3));
	geometry.setAttribute('color', new BufferAttribute(colors, 3));
	geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
		vertexColors: true,
		uniforms: { uScale: { value: 100 }, uMin: { value: minPixels } },
		vertexShader: /* glsl */ `
			attribute float aSize;
			uniform float uScale;
			uniform float uMin;
			varying vec3 vColor;
			varying float vFade;
			void main() {
				float px = aSize * uScale;
				// Points below the minimum size fade instead of shrinking.
				vFade = clamp(px / uMin, 0.0, 1.0);
				gl_PointSize = max(px, uMin) * 2.0;
				vColor = color;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			varying vec3 vColor;
			varying float vFade;
			void main() {
				float d = length(gl_PointCoord - 0.5) * 2.0;
				float a = exp(-d * d * 4.0) * vFade;
				if (a < 0.01) discard;
				gl_FragColor = vec4(vColor * a, a);
			}`
	});
	const points = new Points(geometry, material);
	points.frustumCulled = false;
	return {
		points,
		setScale(pixelsPerUnit) {
			material.uniforms.uScale.value = pixelsPerUnit;
		}
	};
}

/** Collects points one at a time, then packs them for `pointCloud`. */
export function pointBuffer(): {
	add(x: number, y: number, z: number, rgb: readonly [number, number, number], size: number): void;
	build(): PointData;
} {
	const p: number[] = [];
	const c: number[] = [];
	const s: number[] = [];
	return {
		add(x, y, z, rgb, size) {
			p.push(x, y, z);
			c.push(rgb[0], rgb[1], rgb[2]);
			s.push(size);
		},
		build: () => ({
			positions: new Float32Array(p),
			colors: new Float32Array(c),
			sizes: new Float32Array(s)
		})
	};
}
