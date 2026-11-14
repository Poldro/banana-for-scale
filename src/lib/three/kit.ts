/** Small building blocks shared by the procedural models. */
import {
	AdditiveBlending,
	type ColorRepresentation,
	FrontSide,
	type Side,
	ShaderMaterial,
	SRGBColorSpace,
	Sprite,
	SpriteMaterial,
	type Texture,
	TextureLoader,
	type WebGLRenderer
} from 'three';
import { glowTexture } from './glow';

/** Deterministic pseudo-random numbers so a model looks the same every visit. */
export function seeded(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

/** A soft additive halo of diameter `size` model units. */
export function glowSprite(color: ColorRepresentation, size: number, opacity = 1): Sprite {
	const sprite = new Sprite(
		new SpriteMaterial({
			map: glowTexture(),
			color,
			opacity,
			transparent: true,
			blending: AdditiveBlending,
			depthWrite: false
		})
	);
	sprite.scale.setScalar(size);
	return sprite;
}

/** Loads a texture from static/ and calls `onLoad` once it can be drawn. */
export function loadTexture(url: string, renderer: WebGLRenderer, onLoad: () => void, color = true): Texture {
	const texture = new TextureLoader().load(url, onLoad, undefined, () => {
		console.warn(`banana-for-scale: could not load ${url}`);
	});
	if (color) texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
	return texture;
}

/** A see-through shell that glows towards its rim, for atmospheres and bubbles. */
export function rimMaterial(
	rgb: readonly [number, number, number],
	{ power = 3, strength = 1, bias = 0, side = FrontSide as Side } = {}
): ShaderMaterial {
	return new ShaderMaterial({
		side,
		blending: AdditiveBlending,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPower: { value: power },
			uStrength: { value: strength },
			uBias: { value: bias }
		},
		vertexShader: /* glsl */ `
			varying vec3 vNormal;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			uniform float uPower;
			uniform float uStrength;
			uniform float uBias;
			varying vec3 vNormal;
			void main() {
				float facing = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
				float rim = uBias + pow(1.0 - facing, uPower);
				gl_FragColor = vec4(vec3(${rgb.map((c) => c.toFixed(3)).join(', ')}) * rim * uStrength, 1.0);
			}`
	});
}

/** Points on a sphere, spread evenly (Fibonacci lattice). */
export function fibonacciSphere(count: number): Array<[number, number, number]> {
	const golden = Math.PI * (3 - Math.sqrt(5));
	return Array.from({ length: count }, (_, i) => {
		const y = 1 - ((i + 0.5) / count) * 2;
		const rad = Math.sqrt(1 - y * y);
		return [Math.cos(golden * i) * rad, y, Math.sin(golden * i) * rad];
	});
}
