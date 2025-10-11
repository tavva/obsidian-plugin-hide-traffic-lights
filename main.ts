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

			// Show on hover in top-left corner, hide when mouse leaves
			const handleMouseMove = (e: MouseEvent) => {
				// Show if mouse is in top-left 100x50px area
				if (e.clientX < 100 && e.clientY < 50) {
					this.restoreTrafficLights();
				} else {
					this.hideTrafficLights();
				}
			};

			window.addEventListener('mousemove', handleMouseMove);
			this.register(() => {
				window.removeEventListener('mousemove', handleMouseMove);
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
