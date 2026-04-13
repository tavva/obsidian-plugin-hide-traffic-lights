import { Plugin, Platform, WorkspaceWindow, debounce } from 'obsidian';
import { remote } from 'electron';

interface WindowState {
	trafficLightsVisible: boolean;
}

export default class HideTrafficLightsPlugin extends Plugin {
	private debouncedHideAll = debounce(
		() => this.hideAll(),
		50,
		true
	);
	private windowStates = new Map<Window, WindowState>();

	onload() {
		if (!Platform.isMacOS) {
			return;
		}

		this.setupWindow(window);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.debouncedHideAll();
			})
		);

		this.registerEvent(
			this.app.workspace.on('window-open', (_ws: WorkspaceWindow, win: Window) => {
				this.setupWindow(win);
			})
		);

		this.registerEvent(
			this.app.workspace.on('window-close', (_ws: WorkspaceWindow, win: Window) => {
				this.windowStates.delete(win);
			})
		);
	}

	onunload() {
		if (!Platform.isMacOS) {
			return;
		}
		for (const win of this.windowStates.keys()) {
			this.restoreTrafficLights(win);
		}
		this.windowStates.clear();
	}

	private setupWindow(win: Window): void {
		this.windowStates.set(win, { trafficLightsVisible: false });
		this.hideTrafficLights(win);

		this.registerDomEvent(win, 'focus', () => this.hideTrafficLights(win));

		this.registerDomEvent(win, 'mousemove', (e: MouseEvent) => {
			const state = this.windowStates.get(win);
			if (!state) {
				return;
			}
			const shouldBeVisible = e.clientX < 100 && e.clientY < 50;
			if (shouldBeVisible && !state.trafficLightsVisible) {
				this.restoreTrafficLights(win);
				state.trafficLightsVisible = true;
			} else if (!shouldBeVisible && state.trafficLightsVisible) {
				this.hideTrafficLights(win);
				state.trafficLightsVisible = false;
			}
		});
	}

	private hideAll(): void {
		for (const win of this.windowStates.keys()) {
			this.hideTrafficLights(win);
		}
	}

	private getBrowserWindow(win: Window) {
		if (win === window) {
			return remote.getCurrentWindow();
		}
		const electron = (win as Window & { require?: NodeJS.Require }).require?.('electron') as typeof import('electron') | undefined;
		return electron?.remote.getCurrentWindow();
	}

	private hideTrafficLights(win: Window): void {
		try {
			const browserWindow = this.getBrowserWindow(win);
			browserWindow?.setWindowButtonPosition({ x: -100, y: -100 });
		} catch (error) {
			console.error('Failed to hide traffic lights:', error);
		}
	}

	private restoreTrafficLights(win: Window): void {
		try {
			const browserWindow = this.getBrowserWindow(win);
			browserWindow?.setWindowButtonPosition({ x: 10, y: 16 });
		} catch (error) {
			console.error('Failed to restore traffic lights:', error);
		}
	}
}
