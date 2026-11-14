import type { Material, Mesh, Object3D, Texture } from 'three';

function isTexture(value: unknown): value is Texture {
	return typeof value === 'object' && value !== null && (value as Texture).isTexture === true;
}

/**
 * Frees GPU memory held by every mesh under `root`: geometries, materials and
 * their textures. Render-target textures (the shared studio environment) are
 * kept; other shared textures are simply re-uploaded if used again.
 */
export function disposeTree(root: Object3D): void {
	const textures = new Set<Texture>();
	root.traverse((obj) => {
		const mesh = obj as Mesh;
		mesh.geometry?.dispose();
		const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
		for (const m of materials) {
			for (const value of Object.values(m)) if (isTexture(value)) textures.add(value);
			m.dispose();
		}
	});
	for (const texture of textures) {
		if (!(texture as Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) texture.dispose();
	}
}
