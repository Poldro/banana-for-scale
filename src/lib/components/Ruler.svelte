<script lang="ts">
	import type { Level } from '$lib/levels';
	import { superscript } from '$lib/scale';

	interface Props {
		levels: readonly Level[];
		position: number;
		onSelect: (index: number) => void;
	}

	let { levels, position, onSelect }: Props = $props();

	const last = $derived(levels.length - 1);
	/** Top = universe, bottom = Planck: "down" always means smaller. */
	const top = (p: number) => `${((last - p) / last) * 100}%`;
	const active = $derived(Math.round(position));
</script>

<nav class="ruler" aria-label="Scale">
	<span class="end">10{superscript(Math.round(levels[last].exp))} m</span>
	<ol>
		{#each levels as level, i (level.id)}
			<li style:top={top(i)}>
				<button
					class:active={i === active}
					class:banana={level.id === 'banana'}
					aria-label="{level.title}, 10 to the {level.exp.toFixed(1)} metres"
					aria-current={i === active ? 'location' : undefined}
					title={level.title}
					onclick={() => onSelect(i)}
				>
					<span class="tick"></span>
					<span class="name">{level.title}</span>
				</button>
			</li>
		{/each}
		<li class="marker" style:top={top(position)} aria-hidden="true"></li>
	</ol>
	<span class="end">10{superscript(Math.round(levels[0].exp))} m</span>
</nav>

<style>
	.ruler {
		position: fixed;
		right: max(16px, env(safe-area-inset-right));
		top: 4.5rem;
		bottom: 4.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.6rem;
		z-index: 2;
		font-family: var(--mono);
		font-size: 0.68rem;
		color: var(--fg-faint);
	}

	ol {
		position: relative;
		flex: 1;
		width: 2.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
		border-right: 1px solid var(--fg-faint);
	}

	li {
		position: absolute;
		right: 0;
		transform: translateY(-50%);
	}

	button {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		height: 14px;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.tick {
		display: block;
		width: 8px;
		height: 1px;
		background: var(--fg-faint);
		transition:
			width 0.2s,
			background 0.2s;
	}

	button:hover .tick,
	button:focus-visible .tick {
		width: 16px;
		background: var(--fg);
	}

	.banana .tick {
		background: var(--accent);
		width: 12px;
	}

	.name {
		position: absolute;
		right: 24px;
		white-space: nowrap;
		color: var(--fg-dim);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s;
	}

	button:hover .name,
	button:focus-visible .name,
	.active .name {
		opacity: 1;
	}

	.active .name {
		color: var(--fg);
	}

	.marker {
		width: 22px;
		height: 2px;
		margin-right: -1px;
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent);
		pointer-events: none;
	}

	@media (max-width: 640px) {
		.ruler {
			top: 3.75rem;
			bottom: auto;
			height: 38vh;
		}

		.name {
			display: none;
		}
	}
</style>
