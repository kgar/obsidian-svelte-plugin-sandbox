<script lang="ts">
	import type { TFile } from "obsidian";
	import { fileStore } from "./stores";

	let counter = 2;

	export let title = "Svelte Demo View";

	function increment() {
		counter++;
	}

	$: fileStoreValues = Array.from($fileStore.values());
</script>

<h3>{title}</h3>
<p>This is a demo view that uses Svelte.</p>
<p>And it's smart enough to see what I'm up to!</p>
<button on:click={increment}>Clicked {counter} times</button>

<ul>
	{#each fileStoreValues as fileInfo}
		<li title={fileInfo.file.path}>
			{fileInfo.file.name}
			{#if fileInfo.isKgar}🌟{/if}
		</li>
	{/each}
</ul>
