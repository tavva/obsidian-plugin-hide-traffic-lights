// ABOUTME: Type declarations for the electron remote API used at runtime in Obsidian.
// ABOUTME: Only declares the subset of the API this plugin uses.

declare module 'electron' {
	interface BrowserWindow {
		setWindowButtonPosition(position: { x: number; y: number }): void;
	}

	export const remote: {
		getCurrentWindow(): BrowserWindow;
	};
}
