import { z } from 'zod';
import rawLevels from './data/levels.json';
import rawCredits from './data/credits.json';

export const GENERATED_KINDS = [
	'foam',
	'void',
	'quarks',
	'proton',
	'nucleus',
	'atom',
	'dna',
	'ribosome',
	'inner-orbits',
	'heliosphere',
	'outer-orbits',
	'oort',
	'local-group',
	'cosmic-web'
] as const;

export type GeneratedKind = (typeof GENERATED_KINDS)[number];

/** Licenses we accept for redistribution in a public repo. */
export const ALLOWED_LICENSE = /^(Public domain|CC0|CC BY(-SA)? \d\.\d)$/;

const visualSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('generated'), kind: z.enum(GENERATED_KINDS) }),
	z.object({
		type: z.literal('image'),
		commons: z.string().min(1),
		/** Fractions of the source image to trim from each side. */
		crop: z
			.object({
				top: z.number().min(0).max(0.5),
				bottom: z.number().min(0).max(0.5),
				left: z.number().min(0).max(0.5),
				right: z.number().min(0).max(0.5)
			})
			.optional(),
		/** "multiply" makes white photo backgrounds melt into a light page. */
		blend: z.enum(['multiply', 'screen']).optional()
	})
]);

export const levelSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	exp: z.number().min(-36).max(27),
	title: z.string().min(1),
	fact: z.string().min(20).max(400),
	bg: z.string().regex(/^#[0-9a-f]{6}$/i),
	light: z.boolean().optional(),
	visual: visualSchema
});

export const creditSchema = z.object({
	file: z.string().regex(/^img\/[a-z0-9-]+\.webp$/),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	author: z.string().min(1),
	license: z.string().regex(ALLOWED_LICENSE),
	licenseUrl: z.string().url().optional(),
	source: z.string().url()
});

export const levelsSchema = z
	.array(levelSchema)
	.min(2)
	.refine((ls) => ls.every((l, i) => i === 0 || l.exp > ls[i - 1].exp), {
		message: 'levels must be sorted by strictly increasing exp'
	})
	.refine((ls) => new Set(ls.map((l) => l.id)).size === ls.length, {
		message: 'level ids must be unique'
	});

export const creditsSchema = z.record(z.string(), creditSchema);

export type Level = z.infer<typeof levelSchema>;
export type Credit = z.infer<typeof creditSchema>;

export const levels: readonly Level[] = levelsSchema.parse(rawLevels);
export const credits: Readonly<Record<string, Credit>> = creditsSchema.parse(rawCredits);
export const exponents: readonly number[] = levels.map((l) => l.exp);
export const START_INDEX = levels.findIndex((l) => l.id === 'banana');
