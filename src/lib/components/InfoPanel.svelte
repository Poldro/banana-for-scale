<script lang="ts">
	import { fly } from 'svelte/transition';
	import { MODEL_ASSETS, modelCredits, type Credit, type Level } from '$lib/levels';
	import { bananaComparison, formatLength, scientific, sizeRatio } from '$lib/scale';

	interface Props {
		level: Level;
		credit: Credit | undefined;
		exp: number;
		reducedMotion: boolean;
		/** Next stop down (smaller) and up (bigger), if any. */
		smaller: Level | undefined;
		bigger: Level | undefined;
		/** -1 dives to the smaller stop, +1 zooms out to the bigger one. */
		onStep: (direction: -1 | 1) => void;
		/** Set when the stop is currently shown as a 3D model. */
		model?: Level['model'];
	}

	let { level, credit, exp, reducedMotion, smaller, bigger, onStep, model }: Props = $props();

	const modelAssets = $derived(model ? MODEL_ASSETS[model.kind].map((id) => modelCredits[id]) : []);
	const flyIn = $derived({ y: reducedMotion ? 0 : 14, duration: reducedMotion ? 0 : 450 });
</script>

{#snippet neighbour(other: Level, direction: -1 | 1)}
	<button class="neighbour" type="button" onclick={() => onStep(direction)}>
		<span class="arrow" aria-hidden="true">{direction === 1 ? '↑' : '↓'}</span>
		<span class="name">{other.title}</span>
		<span class="ratio">{formatLength(other.exp)} · {sizeRatio(level.exp, other.exp)}</span>
	</button>
{/snippet}

<section class="panel" aria-live="polite">
	{#if bigger}{@render neighbour(bigger, 1)}{/if}
	<p class="readout" aria-hidden="true">{formatLength(exp)}</p>
	<p class="meta" aria-hidden="true">
		<span>{scientific(exp)} m</span>
		<span class="sep">·</span>
		<span>{bananaComparison(exp)}</span>
	</p>

	{#key level.id}
		<div class="story" in:fly={flyIn}>
			<h2>{level.title}</h2>
			<p class="size">
				{formatLength(level.exp)} — {bananaComparison(level.exp)}
			</p>
			<p class="fact">{level.fact}</p>
			<p class="credit">
				{#if model}
					<span class="rotate">3D · drag sideways or ←/→ to rotate</span>
					{#each modelAssets as asset (asset.file)}
						· <a href={asset.source} target="_blank" rel="noopener noreferrer">{asset.author}</a>
						({asset.license})
					{:else}
						· modelled in your browser
					{/each}
				{:else if credit}
					Image: <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a>
					· {#if credit.licenseUrl}<a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer"
							>{credit.license}</a
						>{:else}{credit.license}{/if}
				{:else}
					Illustration generated in your browser — not to be read as a photograph.
				{/if}
			</p>
		</div>
	{/key}
	{#if smaller}{@render neighbour(smaller, -1)}{/if}
</section>

<style>
	.panel {
		position: fixed;
		left: max(16px, env(safe-area-inset-left));
		bottom: max(16px, env(safe-area-inset-bottom));
		z-index: 2;
		width: min(34rem, calc(100vw - 6rem));
		pointer-events: none;
		text-shadow: 0 1px 12px var(--bg);
	}

	.panel a,
	.neighbour {
		pointer-events: auto;
	}

	.neighbour {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.15rem 0.5rem;
		margin: 0;
		padding: 0.3rem 0;
		border: 0;
		background: none;
		color: var(--fg-dim);
		font: inherit;
		font-size: 0.8rem;
		text-align: left;
		cursor: pointer;
		text-shadow: inherit;
	}

	.neighbour:first-child {
		margin-bottom: 0.6rem;
	}

	.neighbour:last-child {
		margin-top: 0.6rem;
	}

	.neighbour:hover .name,
	.neighbour:focus-visible .name {
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: var(--fg-faint);
	}

	.arrow {
		color: var(--accent);
	}

	.ratio {
		font-family: var(--mono);
		font-size: 0.72rem;
		color: var(--fg-faint);
	}

	.readout {
		margin: 0;
		font-family: var(--mono);
		font-weight: 500;
		font-size: clamp(2rem, 6vw, 3.75rem);
		letter-spacing: -0.03em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.meta {
		margin: 0.4rem 0 1.4rem;
		font-family: var(--mono);
		font-size: 0.8rem;
		color: var(--fg-dim);
	}

	.sep {
		margin: 0 0.4em;
		color: var(--fg-faint);
	}

	h2 {
		margin: 0;
		font-family: var(--serif);
		font-weight: 400;
		font-style: italic;
		font-size: clamp(1.6rem, 3.2vw, 2.25rem);
		line-height: 1.1;
	}

	.size {
		margin: 0.25rem 0 0.6rem;
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--accent);
	}

	.fact {
		margin: 0;
		font-size: 0.98rem;
		line-height: 1.5;
		color: var(--fg-dim);
		max-width: 60ch;
	}

	.credit {
		margin: 0.75rem 0 0;
		font-size: 0.7rem;
		color: var(--fg-faint);
	}

	.rotate {
		color: var(--accent);
	}

	.credit a {
		color: var(--fg-dim);
		text-decoration-color: var(--fg-faint);
	}

	@media (max-width: 640px) {
		.panel {
			left: 0;
			bottom: 0;
			width: 100vw;
			padding: 3rem 16px max(16px, env(safe-area-inset-bottom));
			background: linear-gradient(to bottom, transparent, var(--bg) 3rem);
		}

		.meta {
			margin-bottom: 0.9rem;
			font-size: 0.72rem;
		}

		/* The live readout above already shows the size. */
		.size {
			display: none;
		}

		h2 {
			margin-bottom: 0.4rem;
		}

		.fact {
			font-size: 0.9rem;
		}

		.neighbour {
			font-size: 0.75rem;
			padding: 0.15rem 0;
		}

		.neighbour:first-child {
			margin-bottom: 0.4rem;
		}

		.neighbour:last-child {
			margin-top: 0.4rem;
		}
	}
</style>
