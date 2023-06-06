<script lang="ts">
	import type { FileManager, TFile } from "obsidian";
	import { fileStore } from "./stores";

	let counter = 2;
    

	export let title = "Svelte Demo View";
    export let fileManager: FileManager;

	function increment() {
		counter++;
	}

	async function isKgar(file: TFile) {
		let result = false;
		try {
			await fileManager.processFrontMatter(file, (frontmatter) => {
				const key = Object.keys(frontmatter)?.find(
					(k) => k.toLocaleLowerCase() === "kgar"
				);
				result = !!key && frontmatter[key] == true;
			});
		} catch (_) {}
		return result;
	}
</script>

<h3>{title}</h3>
<p>This is a demo view that uses Svelte.</p>
<p>And it's smart enough to see what I'm up to!</p>
<button on:click={increment}>Clicked {counter} times</button>

<ul>
	{#each $fileStore as file}
		<li>
			{file.name}
			{#await isKgar(file) then kgar}{#if kgar}🌟{/if}{/await}
		</li>
	{/each}
</ul>
