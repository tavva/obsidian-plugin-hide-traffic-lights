# Hide Traffic Lights

A simple Obsidian plugin that hides macOS traffic light buttons (red, yellow, green window controls) for a cleaner, distraction-free experience.

## Features

- Automatically hides traffic lights on plugin load
- Monitors window events to keep them hidden during use
- Restores traffic lights when plugin is disabled
- macOS only (does nothing on other platforms)
- Zero configuration needed

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Settings → Community plugins
2. Search for "Hide Traffic Lights"
3. Click Install, then Enable

### Manual Installation

1. Download the latest release from GitHub
2. Extract `main.js` and `manifest.json` into your vault's plugins folder:
   `VaultFolder/.obsidian/plugins/hide-traffic-lights/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## How It Works

The plugin uses Electron's `setTrafficLightPosition()` API to move the traffic light buttons off-screen (position: -100, -100). It monitors these events to re-apply the setting:

- Window focus changes
- Workspace layout changes (pane splits, tab changes)
- New window creation

When you disable the plugin, traffic lights are restored to their default position.

## Development

```bash
# Install dependencies
npm install

# Build plugin
npm run build

# Development mode (auto-rebuild)
npm run dev
```

## Support

If you encounter issues, please report them on [GitHub Issues](https://github.com/yourusername/obsidian-plugin-hide-traffic-lights/issues).

## License

MIT
