import { Plugin, Platform, debounce } from 'obsidian';
import { remote } from 'electron';

export default class HideTrafficLightsPlugin extends Plugin {
	private debouncedHide = debounce(
		() => this.hideTrafficLights(),
		50,
		true
	);
	private trafficLightsVisible = false;

	onload() {
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
			this.registerDomEvent(window, 'focus', () => this.hideTrafficLights());

			// Show on hover in top-left corner, hide when mouse leaves
			const handleMouseMove = (e: MouseEvent) => {
				const shouldBeVisible = e.clientX < 100 && e.clientY < 50;

				// Only update if state changed
				if (shouldBeVisible && !this.trafficLightsVisible) {
					this.restoreTrafficLights();
					this.trafficLightsVisible = true;
				} else if (!shouldBeVisible && this.trafficLightsVisible) {
					this.hideTrafficLights();
					this.trafficLightsVisible = false;
				}
			};

			this.registerDomEvent(window, 'mousemove', handleMouseMove);
		}
	}

	onunload() {
		// Restore traffic lights on macOS
		if (Platform.isMacOS) {
			this.restoreTrafficLights();
		}
	}

	private hideTrafficLights(): void {
		try {
			const win = remote.getCurrentWindow();
			win.setWindowButtonPosition({ x: -100, y: -100 });
		} catch (error) {
			console.error('Failed to hide traffic lights:', error);
		}
	}

	private restoreTrafficLights(): void {
		try {
			const win = remote.getCurrentWindow();
			// macOS default position
			win.setWindowButtonPosition({ x: 10, y: 16 });
		} catch (error) {
			console.error('Failed to restore traffic lights:', error);
		}
	}
}
