/**
 * A small least-recently-used cache. When it grows past `capacity`, the
 * oldest entries are handed to `evict` (e.g. to free GPU memory) and dropped.
 */
export interface Lru<K, V> {
	get(key: K): V | undefined;
	set(key: K, value: V): void;
	readonly size: number;
	clear(): void;
}

export function createLru<K, V>(capacity: number, evict: (value: V, key: K) => void): Lru<K, V> {
	if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer');
	// Map keeps insertion order: re-inserting on access moves a key to the end.
	const entries = new Map<K, V>();

	return {
		get(key) {
			const value = entries.get(key);
			if (value === undefined) return undefined;
			entries.delete(key);
			entries.set(key, value);
			return value;
		},
		set(key, value) {
			entries.delete(key);
			entries.set(key, value);
			while (entries.size > capacity) {
				const [oldestKey, oldest] = entries.entries().next().value as [K, V];
				entries.delete(oldestKey);
				evict(oldest, oldestKey);
			}
		},
		get size() {
			return entries.size;
		},
		clear() {
			for (const [key, value] of entries) evict(value, key);
			entries.clear();
		}
	};
}
