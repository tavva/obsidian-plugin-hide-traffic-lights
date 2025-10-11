import { Plugin, Platform, debounce } from 'obsidian';

export default class HideTrafficLightsPlugin extends Plugin {
	private debouncedHide = debounce(
		() => this.hideTrafficLights(),
		50,
		true
	);

	async onload() {
		console.log('Loading Hide Traffic Lights plugin');

		// Only run on macOS
		if (Platform.isMacOS) {
			// Initial hide
			this.hideTrafficLights();

			// Re-hide on layout changes (debounced to avoid excessive calls)
			this.registerEvent(
				this.app.workspace.on('layout-change', () => {
					this.debouncedHide();
				})
			);

			// Re-hide on window open (multi-window support)
			this.registerEvent(
				this.app.workspace.on('window-open', () => {
					this.hideTrafficLights();
				})
			);

			// Re-hide on window focus
			window.addEventListener('focus', this.hideTrafficLights.bind(this));
			this.register(() => {
				window.removeEventListener('focus', this.hideTrafficLights.bind(this));
			});
		}
	}

	async onunload() {
		console.log('Unloading Hide Traffic Lights plugin');

		// Restore traffic lights on macOS
		if (Platform.isMacOS) {
			this.restoreTrafficLights();
		}
	}

	private hideTrafficLights(): void {
		try {
			const electron = require('electron');
			const window = electron.remote.getCurrentWindow();
			window.setWindowButtonPosition({ x: -100, y: -100 });
		} catch (error) {
			console.error('Failed to hide traffic lights:', error);
		}
	}

	private restoreTrafficLights(): void {
		try {
			const electron = require('electron');
			const window = electron.remote.getCurrentWindow();
			// macOS default position
			window.setWindowButtonPosition({ x: 10, y: 16 });
		} catch (error) {
			console.error('Failed to restore traffic lights:', error);
		}
	}
}
