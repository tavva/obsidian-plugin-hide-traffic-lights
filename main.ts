// Hides the macOS traffic-light buttons and shifts Obsidian's tab/ribbon area
// flush left. Hovering the very top of the window slides down a thin overlay
// bar; while the bar is open the native traffic lights are visible at a known
// position, so the user can drag the window from the bar or click the buttons.
//
// Implementation notes:
// - Obsidian's titlebar has `-webkit-app-region: drag` on macOS. The OS
//   intercepts mouse events over drag regions, so `mousemove` on `window` does
//   not fire reliably across the top of the screen. We add a dedicated 6px
//   `no-drag` trigger strip whose `mouseenter` is reliable everywhere.
// - macOS resets the custom traffic-light position when the window is moved,
//   so we re-apply `setWindowButtonPosition` on every reveal and on every
//   `mouseup` (end of drag).
// - Window `resize` (and any other "things might be moving" event) snaps the
//   bar up instantly via direct inline style, bypassing the slide transition.

import { Plugin, Platform, WorkspaceWindow, debounce } from 'obsidian';
import { remote } from 'electron';

const STYLE_ID = 'hide-traffic-lights-styles';
const BODY_CLASS = 'hide-traffic-lights-active';
const HOVER_ATTR = 'data-tl-hover';
const BAR_CLASS = 'hide-traffic-lights-bar';
const TRIGGER_CLASS = 'hide-traffic-lights-trigger';

const BUTTON_X = 12;
const BUTTON_Y = 13;
const BAR_HEIGHT_PX = 28;
const TRIGGER_HEIGHT_PX = 6;
const HIDE_DELAY_MS = 180;

const STYLE_TEXT = `
body.${BODY_CLASS} .titlebar .titlebar-button-container.mod-left,
body.${BODY_CLASS} .workspace > .titlebar-button-container.mod-left {
	display: none !important;
}
body.${BODY_CLASS} .workspace-tab-header-container { padding-left: 0 !important; }
body.${BODY_CLASS} .titlebar { padding-left: 0 !important; }
body.${BODY_CLASS} { --frame-left-space: 0px; }

body.${BODY_CLASS} .${TRIGGER_CLASS} {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	height: ${TRIGGER_HEIGHT_PX}px !important;
	background: transparent !important;
	-webkit-app-region: no-drag !important;
	pointer-events: auto !important;
	z-index: 1000000 !important;
}

body.${BODY_CLASS} .${BAR_CLASS} {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	height: ${BAR_HEIGHT_PX}px !important;
	background: var(--background-primary) !important;
	border-bottom: 1px solid var(--background-modifier-border) !important;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18) !important;
	transform: translateY(-100%) !important;
	transition: transform 140ms ease !important;
	z-index: 999998 !important;
	-webkit-app-region: drag !important;
	pointer-events: auto !important;
	margin: 0 !important;
	padding: 0 !important;
}
body.${BODY_CLASS}[${HOVER_ATTR}="true"] .${BAR_CLASS} {
	transform: translateY(0) !important;
}
`;

interface WindowState {
	styleEl: HTMLStyleElement;
	barEl: HTMLElement;
	triggerEl: HTMLElement;
	hideTimer: number | null;
	revealed: boolean;
}

export default class HideTrafficLightsPlugin extends Plugin {
	private windowStates = new Map<Window, WindowState>();
	private debouncedReapply = debounce(() => this.reapplyAll(), 50, true);

	onload() {
		if (!Platform.isMacOS) {
			return;
		}

		this.setupWindow(window);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.debouncedReapply();
			})
		);

		this.registerEvent(
			this.app.workspace.on('window-open', (_ws: WorkspaceWindow, win: Window) => {
				this.setupWindow(win);
			})
		);

		this.registerEvent(
			this.app.workspace.on('window-close', (_ws: WorkspaceWindow, win: Window) => {
				this.teardownWindow(win);
			})
		);
	}

	onunload() {
		if (!Platform.isMacOS) {
			return;
		}
		for (const win of Array.from(this.windowStates.keys())) {
			this.teardownWindow(win);
		}
	}

	private setupWindow(win: Window): void {
		if (this.windowStates.has(win)) {
			return;
		}

		const doc = win.document;

		const styleEl = doc.createElement('style');
		styleEl.id = STYLE_ID;
		styleEl.textContent = STYLE_TEXT;
		doc.head.appendChild(styleEl);

		const barEl = doc.createElement('div');
		barEl.className = BAR_CLASS;
		doc.body.appendChild(barEl);

		const triggerEl = doc.createElement('div');
		triggerEl.className = TRIGGER_CLASS;
		doc.body.appendChild(triggerEl);

		doc.body.classList.add(BODY_CLASS);

		this.setButtonPosition(win, { x: BUTTON_X, y: BUTTON_Y });

		const state: WindowState = {
			styleEl,
			barEl,
			triggerEl,
			hideTimer: null,
			revealed: false,
		};
		this.windowStates.set(win, state);

		this.setVisibility(win, false);

		this.registerDomEvent(triggerEl, 'mouseenter', () => this.reveal(win));
		this.registerDomEvent(barEl, 'mouseenter', () => this.reveal(win));

		this.registerDomEvent(win, 'mousemove', (e: MouseEvent) => {
			const s = this.windowStates.get(win);
			if (!s) return;
			if (s.revealed && e.clientY >= BAR_HEIGHT_PX) {
				this.scheduleHide(win);
			}
		});

		this.registerDomEvent(win, 'resize', () => this.hideImmediately(win));
		this.registerDomEvent(win, 'mouseup', () => {
			this.setButtonPosition(win, { x: BUTTON_X, y: BUTTON_Y });
		});
	}

	private teardownWindow(win: Window): void {
		const state = this.windowStates.get(win);
		if (!state) {
			return;
		}

		if (state.hideTimer !== null) {
			win.clearTimeout(state.hideTimer);
		}

		this.setButtonPosition(win, null);
		this.setVisibility(win, true);

		state.barEl.remove();
		state.triggerEl.remove();
		state.styleEl.remove();
		win.document.body.classList.remove(BODY_CLASS);
		win.document.body.removeAttribute(HOVER_ATTR);

		this.windowStates.delete(win);
	}

	private reveal(win: Window): void {
		const state = this.windowStates.get(win);
		if (!state) return;
		if (state.hideTimer !== null) {
			win.clearTimeout(state.hideTimer);
			state.hideTimer = null;
		}
		if (state.revealed) return;
		state.revealed = true;
		win.document.body.setAttribute(HOVER_ATTR, 'true');
		this.setVisibility(win, true);
	}

	private scheduleHide(win: Window): void {
		const state = this.windowStates.get(win);
		if (!state || !state.revealed || state.hideTimer !== null) return;
		state.hideTimer = win.setTimeout(() => {
			state.hideTimer = null;
			if (!state.revealed) return;
			this.doHide(win, state);
		}, HIDE_DELAY_MS);
	}

	private hideImmediately(win: Window): void {
		const state = this.windowStates.get(win);
		if (!state) return;
		if (state.hideTimer !== null) {
			win.clearTimeout(state.hideTimer);
			state.hideTimer = null;
		}
		this.setVisibility(win, false);
		state.barEl.style.setProperty('transition', 'none', 'important');
		state.barEl.style.setProperty('transform', 'translateY(-100%)', 'important');
		win.requestAnimationFrame(() => {
			state.barEl.style.removeProperty('transition');
			state.barEl.style.removeProperty('transform');
		});
		state.revealed = false;
		win.document.body.removeAttribute(HOVER_ATTR);
	}

	private doHide(win: Window, state: WindowState): void {
		state.revealed = false;
		this.setVisibility(win, false);
		win.document.body.removeAttribute(HOVER_ATTR);
	}

	private reapplyAll(): void {
		for (const [win, state] of this.windowStates) {
			this.setButtonPosition(win, { x: BUTTON_X, y: BUTTON_Y });
			this.setVisibility(win, state.revealed);
		}
	}

	private getBrowserWindow(win: Window) {
		if (win === window) {
			return remote.getCurrentWindow();
		}
		const electron = (win as Window & { require?: NodeJS.Require }).require?.('electron') as typeof import('electron') | undefined;
		return electron?.remote.getCurrentWindow();
	}

	private setVisibility(win: Window, visible: boolean): void {
		try {
			const bw = this.getBrowserWindow(win);
			if (!bw) return;
			// Re-apply position before each show: macOS resets it on window move.
			if (visible) bw.setWindowButtonPosition({ x: BUTTON_X, y: BUTTON_Y });
			bw.setWindowButtonVisibility(visible);
		} catch (error) {
			console.error('Failed to set traffic lights visibility:', error);
		}
	}

	private setButtonPosition(win: Window, pos: { x: number; y: number } | null): void {
		try {
			this.getBrowserWindow(win)?.setWindowButtonPosition(pos);
		} catch (error) {
			console.error('Failed to set traffic lights position:', error);
		}
	}
}
