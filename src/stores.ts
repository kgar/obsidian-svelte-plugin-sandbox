import type { TFile } from "obsidian";
import { writable } from "svelte/store";

export type HelloWorldFileInfo = {
	file: TFile;
	isKgar: boolean;
	needsUpdate?: boolean;
};

export const fileStore = writable<Map<string, HelloWorldFileInfo>>(
	new Map<string, HelloWorldFileInfo>()
);
