<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import InfoPanel from '$lib/components/InfoPanel.svelte';
	import Ruler from '$lib/components/Ruler.svelte';
	import { credits, exponents, levels, START_INDEX } from '$lib/levels';
	import { createNavigator, type Navigator } from '$lib/navigation';
	import { luminance } from '$lib/render/color';
	import { createRenderer } from '$lib/render/renderer';
	import { exponentAt, nearestIndex } from '$lib/scale';

	let canvas: HTMLCanvasElement;
	let position = $state(START_INDEX);
	let showHint = $state(true);
	let reducedMotion = $state(false);
	let failed = $state(false);
	let navigator: Navigator | undefined;

	const exp = $derived(exponentAt(exponents, position));
	const index = $derived(nearestIndex(position, levels.length));
	const level = $derived(levels[index]);

	function indexFromHash(): number {
		const id = decodeURIComponent(location.hash.slice(1));
		const i = levels.findIndex((l) => l.id === id);
		return i >= 0 ? i : START_INDEX;
	}

	onMount(() => {
		reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		position = indexFromHash();

		let renderer: ReturnType<typeof createRenderer>;
		try {
			renderer = createRenderer(canvas, levels, credits);
		} catch {
			failed = true;
			return;
		}

		let lastBg = '';
		let raf = 0;
		const t0 = performance.now();
		const loop = (now: number) => {
			const t = reducedMotion ? 0 : (now - t0) / 1000;
			renderer.frame(position, exponentAt(exponents, position), t);
			const bg = renderer.background(position);
			if (bg !== lastBg) {
				lastBg = bg;
				const root = document.documentElement;
				root.style.setProperty('--bg', bg);
				root.toggleAttribute('data-light', luminance(bg) > 0.4);
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);

		navigator = createNavigator({
			count: levels.length,
			start: position,
			reducedMotion,
			onChange: (p) => (position = p),
			onSettle: (i) => history.replaceState(history.state, '', `#${levels[i].id}`),
			onFirstInput: () => (showHint = false)
		});

		const onResize = () => renderer.resize();
		const onHash = () => navigator?.goTo(indexFromHash());
		window.addEventListener('resize', onResize);
		window.addEventListener('hashchange', onHash);

		return () => {
			cancelAnimationFrame(raf);
			navigator?.destroy();
			window.removeEventListener('resize', onResize);
			window.removeEventListener('hashchange', onHash);
		};
	});
</script>

<svelte:head>
	<title>{level.title} · Banana for Scale</title>
</svelte:head>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<header>
	<h1>Banana <em>for</em> Scale</h1>
	<a class="about" href={resolve('/credits')}>About &amp; credits</a>
</header>

{#if failed}
	<p class="error">Your browser could not start the canvas renderer. Try a recent version of Firefox, Chrome or Safari.</p>
{/if}

<Ruler {levels} {position} onSelect={(i) => navigator?.goTo(i)} />
<InfoPanel
	{level}
	credit={credits[level.id]}
	{exp}
	{reducedMotion}
	smaller={levels[index - 1]}
	bigger={levels[index + 1]}
	onStep={(direction) => navigator?.step(direction)}
/>

{#if showHint}
	<p class="hint" out:fade={{ duration: 400 }}>
		<span>Scroll or swipe <strong>down</strong> to dive into the banana</span>
		<span><strong>up</strong> to zoom out to the universe</span>
	</p>
{/if}

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
	}

	:global(body) {
		overflow: hidden;
		overscroll-behavior: none;
	}

	header {
		position: fixed;
		top: max(16px, env(safe-area-inset-top));
		left: max(16px, env(safe-area-inset-left));
		right: max(16px, env(safe-area-inset-right));
		z-index: 3;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		font-family: var(--serif);
		font-weight: 400;
		font-size: 1.35rem;
		letter-spacing: 0.01em;
	}

	h1 em {
		color: var(--accent);
	}

	.about {
		font-size: 0.8rem;
		color: var(--fg-dim);
		text-decoration-color: var(--fg-faint);
	}

	.hint {
		position: fixed;
		top: 4.5rem;
		left: 50%;
		z-index: 2;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		margin: 0;
		width: max-content;
		max-width: calc(100vw - 32px);
		padding: 0.6rem 1rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg) 75%, transparent);
		backdrop-filter: blur(6px);
		font-size: 0.85rem;
		text-align: center;
		color: var(--fg-dim);
		pointer-events: none;
	}

	.hint strong {
		color: var(--fg);
	}

	.error {
		position: fixed;
		inset: 40% 16px auto;
		text-align: center;
	}

	@media (max-width: 640px) {
		.hint {
			top: 3.75rem;
			left: 16px;
			transform: none;
			max-width: calc(100vw - 88px);
			align-items: flex-start;
			text-align: left;
			border-radius: 12px;
		}
	}
</style>
