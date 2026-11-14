<script lang="ts">
	import { resolve } from '$app/paths';
	import { credits, levels } from '$lib/levels';
	import { formatLength } from '$lib/scale';

	const rows = [...levels].reverse();
</script>

<svelte:head>
	<title>About &amp; credits · Banana for Scale</title>
</svelte:head>

<main>
	<a class="back" href={resolve('/')}>← Back to the banana</a>
	<h1>About <em>&amp;</em> credits</h1>

	<p>
		<strong>Banana for Scale</strong> is a scroll-driven journey across about 62 orders of
		magnitude, from the Planck length (10⁻³⁵ m) to the observable universe (10²⁷ m). Each stop
		shows something whose size sits at that power of ten. The scroll is spread evenly over the
		stops, not over the metres: crossing the near-empty gap between an atom and its nucleus costs
		as much scrolling as going from a bee to a banana.
	</p>
	<p>
		Photographs and scientific images come from Wikimedia Commons and are shown under the licenses
		listed below. Where no picture can exist — inside atoms, below the reach of any microscope — or
		where a diagram tells more than a photo, the illustration is drawn procedurally in your browser
		and is labelled as such. Sizes are approximate and rounded.
	</p>

	<h2>Image credits</h2>
	<table>
		<thead>
			<tr><th>Stop</th><th>Size</th><th>Image</th><th>License</th></tr>
		</thead>
		<tbody>
			{#each rows as level (level.id)}
				{@const credit = credits[level.id]}
				<tr>
					<td><a href="{resolve('/')}#{level.id}">{level.title}</a></td>
					<td class="mono">{formatLength(level.exp)}</td>
					{#if credit}
						<td><a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a></td>
						<td>
							{#if credit.licenseUrl}
								<a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a>
							{:else}
								{credit.license}
							{/if}
						</td>
					{:else}
						<td class="dim">Generated illustration</td>
						<td class="dim">MIT (this project)</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	<p class="dim">
		Images marked CC BY-SA remain under that license; the WebP copies in this project are resized
		versions of the originals. Built with SvelteKit and GSAP. Source code is MIT-licensed.
	</p>
</main>

<style>
	main {
		max-width: 52rem;
		margin: 0 auto;
		padding: max(24px, env(safe-area-inset-top)) 16px 4rem;
		line-height: 1.6;
	}

	.back {
		font-size: 0.85rem;
		color: var(--fg-dim);
	}

	h1 {
		margin: 1.5rem 0 1rem;
		font-family: var(--serif);
		font-weight: 400;
		font-size: clamp(2.2rem, 6vw, 3.5rem);
		line-height: 1;
	}

	h1 em,
	strong {
		color: var(--accent);
	}

	h2 {
		margin-top: 2.5rem;
		font-family: var(--serif);
		font-weight: 400;
		font-style: italic;
		font-size: 1.75rem;
	}

	p {
		color: var(--fg-dim);
		max-width: 65ch;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	th,
	td {
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid var(--fg-faint);
		text-align: left;
		vertical-align: top;
	}

	th {
		font-weight: 500;
		color: var(--fg-dim);
	}

	.mono {
		font-family: var(--mono);
		white-space: nowrap;
	}

	.dim {
		color: var(--fg-faint);
	}

	@media (max-width: 640px) {
		th:nth-child(2),
		td:nth-child(2) {
			display: none;
		}
	}
</style>
