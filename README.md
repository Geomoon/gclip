# GClip - GNOME Clipboard Manager

A lightweight clipboard manager extension for GNOME Shell with a Windows-style popup interface. Fully compatible with Wayland.

## Features

- 📋 **Text & Image Support**: Manages both text and image clipboard history
- ⚡ **Quick Access**: Open with `Super+V` (configurable)
- 🔍 **Search**: Filter clipboard history with fuzzy search
- 💾 **Persistent Storage**: Keeps history across sessions
- 🖼️ **Image Management**: Automatically saves and manages clipboard images
- 🎨 **Clean UI**: Modern, dark-themed popup interface
- ⌨️ **Keyboard Navigation**: Full keyboard control (arrow keys, Enter, Delete, Esc)

## Installation

### From Source

1. Clone this repository:
   ```bash
   cd ~/.local/share/gnome-shell/extensions/
   git clone <repository-url> gclip@usuario.dev
   ```

2. Compile the GSettings schema:
   ```bash
   cd gclip@usuario.dev
   glib-compile-schemas schemas/
   ```

3. Enable the extension:
   ```bash
   gnome-extensions enable gclip@usuario.dev
   ```

4. Restart GNOME Shell:
   - X11: Press `Alt+F2`, type `r`, press Enter
   - Wayland: Log out and log back in

## Usage

1. **Open Clipboard History**: Press `Super+V`
2. **Navigate**: Use arrow keys (↑/↓) or mouse hover
3. **Select Item**: Press Enter or click to copy to clipboard
4. **Delete Item**: Press Delete key
5. **Search**: Start typing to filter items
6. **Close**: Press Esc or click outside

## File Structure

```
gclip@usuario.dev/
├── extension.js          # Main extension entry point, handles enable/disable
├── clipboardManager.js   # Core clipboard monitoring and history management
├── clipboardPopup.js     # UI popup window with search and navigation
├── prefs.js             # Settings/preferences UI
├── metadata.json        # Extension metadata and version info
├── stylesheet.css       # Popup styling and theming
├── schemas/             # GSettings configuration schemas
│   └── org.gnome.shell.extensions.gclip.gschema.xml
└── README.md           # This file
```

## Data Storage

Clipboard data is stored in `~/.local/share/gclip/`:
- `history.json`: Text entries and image metadata
- `images/`: Directory containing saved clipboard images (PNG format)

## Configuration

Open extension preferences:
```bash
gnome-extensions prefs gclip@usuario.dev
```

Settings:
- **Max History Items**: Number of items to keep (default: 100)
- **Keyboard Shortcut**: Change the keybinding (default: Super+V)
- **Clear History**: Delete all saved clipboard data

## Requirements

- GNOME Shell 45+
- Wayland or X11

## Technical Details

- **Language**: JavaScript (GJS)
- **Storage**: JSON files + PNG images
- **Clipboard Access**: Native `St.Clipboard` API
- **Monitoring**: Polling every 500ms for clipboard changes
- **Duplicate Detection**: Hash-based for images, content comparison for text

## Troubleshooting

**Extension not appearing:**
```bash
# Check if extension is loaded
gnome-extensions list

# View logs
journalctl -f -o cat /usr/bin/gnome-shell
```

**Keybinding not working:**
- Check if another extension uses the same shortcut
- Verify in extension preferences

**Images not saving:**
- Check permissions on `~/.local/share/gclip/`
- Ensure disk space is available

## License

MIT License

## Author

Created for efficient clipboard management on GNOME/Wayland
