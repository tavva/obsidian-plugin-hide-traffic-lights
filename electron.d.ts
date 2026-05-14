// ABOUTME: Type declarations for the electron remote API used at runtime in Obsidian.
// ABOUTME: Only declares the subset of the API this plugin uses.

declare module 'electron' {
	interface BrowserWindow {
		setWindowButtonVisibility(visible: boolean): void;
		setWindowButtonPosition(position: { x: number; y: number } | null): void;
	}

	export const remote: {
		getCurrentWindow(): BrowserWindow;
	};
}
