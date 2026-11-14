import { z } from 'zod';
import rawLevels from './data/levels.json';
import rawCredits from './data/credits.json';
import rawModelCredits from './data/model-credits.json';

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

/** Stops that can be shown as a rotatable 3D model. */
export const MODEL_KINDS = [
	'foam',
	'proton',
	'nucleus',
	'atom',
	'dna',
	'ribosome',
	'virus',
	'ecoli',
	'rbc',
	'pollen',
	'banana',
	'saturn-v',
	'burj-khalifa',
	'everest',
	'moon',
	'earth',
	'jupiter',
	'sun',
	'inner-orbits',
	'outer-orbits',
	'heliosphere',
	'oort',
	'milky-way',
	'local-group',
	'cosmic-web',
	'cmb'
] as const;

export type ModelKind = (typeof MODEL_KINDS)[number];

/** Downloaded assets each model needs; procedural models need none. */
export const MODEL_ASSETS: Readonly<Record<ModelKind, readonly string[]>> = {
	foam: [],
	proton: [],
	nucleus: [],
	atom: [],
	dna: [],
	ribosome: [],
	virus: [],
	ecoli: [],
	rbc: [],
	pollen: [],
	banana: ['banana'],
	'saturn-v': ['saturn-v'],
	'burj-khalifa': [],
	everest: ['everest'],
	moon: ['moon-texture', 'moon-relief'],
	earth: ['earth-texture'],
	jupiter: ['jupiter-texture'],
	sun: [],
	'inner-orbits': [],
	'outer-orbits': [],
	heliosphere: [],
	oort: [],
	'milky-way': [],
	'local-group': [],
	'cosmic-web': [],
	cmb: ['cmb-texture']
};

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
	/** 2D picture; also the fallback when a model cannot be shown. */
	visual: visualSchema,
	model: z.object({ kind: z.enum(MODEL_KINDS) }).optional()
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

/** Attribution for a 3D model or texture. */
export const assetCreditSchema = z.object({
	file: z.string().regex(/^(models\/[a-z0-9-]+\.glb|textures\/[a-z0-9-]+\.webp)$/),
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
export type AssetCredit = z.infer<typeof assetCreditSchema>;

export const levels: readonly Level[] = levelsSchema.parse(rawLevels);
export const credits: Readonly<Record<string, Credit>> = creditsSchema.parse(rawCredits);
export const modelCredits: Readonly<Record<string, AssetCredit>> = z
	.record(z.string(), assetCreditSchema)
	.parse(rawModelCredits);
export const exponents: readonly number[] = levels.map((l) => l.exp);
export const START_INDEX = levels.findIndex((l) => l.id === 'banana');
