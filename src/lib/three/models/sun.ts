/** A procedural Sun: granulation, sunspots and limb darkening in a shader, plus a soft corona. */
import { AdditiveBlending, Mesh, Scene, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial } from 'three';
import { disposeTree } from '../dispose';
import { glowTexture } from '../glow';
import type { ModelFactory } from '../types';

const SPIN_RATE = 0.04;

const surface = () =>
	new ShaderMaterial({
		toneMapped: false,
		uniforms: { uTime: { value: 0 } },
		vertexShader: /* glsl */ `
			varying vec3 vNormal;
			varying vec3 vPos;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				vPos = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			uniform float uTime;
			varying vec3 vNormal;
			varying vec3 vPos;
			float hash(vec3 p) {
				p = fract(p * 0.3183099 + 0.1);
				p *= 17.0;
				return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
			}
			float noise(vec3 x) {
				vec3 i = floor(x);
				vec3 f = fract(x);
				f = f * f * (3.0 - 2.0 * f);
				return mix(
					mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
					mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
					f.z);
			}
			float fbm(vec3 p) {
				float v = 0.0;
				float a = 0.5;
				for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
				return v;
			}
			void main() {
				float mu = clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
				float grain = fbm(vPos * 14.0 + vec3(0.0, uTime * 0.08, uTime * 0.05));
				float spots = smoothstep(0.7, 0.76, fbm(vPos * 4.0 + 7.3));
				vec3 color = mix(vec3(0.95, 0.32, 0.03), vec3(1.0, 0.78, 0.36), grain);
				color *= 0.3 + 0.7 * pow(mu, 0.45);
				color *= 1.0 - 0.75 * spots;
				gl_FragColor = vec4(color, 1.0);
			}`
	});

export const sun: ModelFactory = () => {
	const scene = new Scene();
	const corona = new Sprite(
		new SpriteMaterial({
			map: glowTexture(),
			color: '#ff9a3c',
			blending: AdditiveBlending,
			depthWrite: false,
			opacity: 0.7
		})
	);
	corona.scale.setScalar(2.9);
	corona.renderOrder = -1;
	scene.add(corona);
	const material = surface();
	const body = new Mesh(new SphereGeometry(1, 128, 96), material);
	scene.add(body);

	return {
		scene,
		extent: 1.35,
		ready: true,
		update(t, spin) {
			material.uniforms.uTime.value = t;
			body.rotation.y = t * SPIN_RATE + spin;
		},
		dispose: () => disposeTree(scene)
	};
};
