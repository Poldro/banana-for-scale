import type { Material, Mesh, Object3D } from 'three';

/** Frees GPU memory held by every mesh under `root` (shared textures excluded). */
export function disposeTree(root: Object3D): void {
	root.traverse((obj) => {
		const mesh = obj as Mesh;
		mesh.geometry?.dispose();
		const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
		for (const m of materials) m.dispose();
	});
}
