import { describe, expect, it } from 'vitest';
import { createLru } from './lru';

describe('createLru', () => {
	it('evicts the least recently used entry beyond capacity', () => {
		const evicted: string[] = [];
		const lru = createLru<string, number>(2, (_, k) => evicted.push(k));
		lru.set('a', 1);
		lru.set('b', 2);
		lru.get('a');
		lru.set('c', 3);
		expect(evicted).toEqual(['b']);
		expect(lru.get('a')).toBe(1);
		expect(lru.get('b')).toBeUndefined();
		expect(lru.size).toBe(2);
	});

	it('evicts everything on clear', () => {
		const evicted: number[] = [];
		const lru = createLru<string, number>(3, (v) => evicted.push(v));
		lru.set('a', 1);
		lru.set('b', 2);
		lru.clear();
		expect(evicted).toEqual([1, 2]);
		expect(lru.size).toBe(0);
	});

	it('rejects a capacity below one', () => {
		expect(() => createLru(0, () => {})).toThrow();
	});
});
