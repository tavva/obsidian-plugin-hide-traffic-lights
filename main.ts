import { Plugin, Platform } from 'obsidian';

export default class HideTrafficLightsPlugin extends Plugin {
	async onload() {
		console.log('Loading Hide Traffic Lights plugin');

		// Only run on macOS
		if (Platform.isMacOS) {
			this.hideTrafficLights();
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
			window.setTrafficLightPosition({ x: -100, y: -100 });
		} catch (error) {
			console.error('Failed to hide traffic lights:', error);
		}
	}

	private restoreTrafficLights(): void {
		try {
			const electron = require('electron');
			const window = electron.remote.getCurrentWindow();
			// macOS default position
			window.setTrafficLightPosition({ x: 10, y: 16 });
		} catch (error) {
			console.error('Failed to restore traffic lights:', error);
		}
	}
}
