# GClip - GNOME Clipboard Manager

A lightweight clipboard manager extension for GNOME Shell with a Windows-style popup interface. Fully compatible with Wayland.

## Features

<img width="770" height="433" alt="image" src="https://github.com/user-attachments/assets/c696446b-7722-4135-8d45-c2b1093ff4f8" />


- 📋 **Text & Image Support**: Manages both text and image clipboard history
- ⚡ **Quick Access**: Open with `Super+Shift+V` (configurable)
- 🔍 **Search**: Filter clipboard history with fuzzy search
- 💾 **Persistent Storage**: Keeps history across sessions
- 🖼️ **Image Management**: Automatically saves and manages clipboard images
- 🎨 **Clean UI**: Modern, dark-themed popup interface
- ⌨️ **Keyboard Navigation**: Full keyboard control (arrow keys, Enter, Delete, Esc)
- 📌 **Marcadores**: Pin items permanently outside the history limit

## Installation

### From Source

1. Clone this repository:
   ```bash
   cd ~/.local/share/gnome-shell/extensions/
   git clone <repository-url> gclip@Geomoon.dev
   ```

2. Compile the GSettings schema:
   ```bash
   cd gclip@Geomoon.dev
   glib-compile-schemas schemas/
   ```

3. Enable the extension:
   ```bash
   gnome-extensions enable gclip@Geomoon.dev
   ```

4. Restart GNOME Shell:
   - X11: Press `Alt+F2`, type `r`, press Enter
   - Wayland: Log out and log back in

## Usage

1. **Open Clipboard History**: Press `Super+Shift+V`
2. **Navigate**: Use arrow keys (↑/↓) or mouse hover
3. **Switch Tabs**: Use arrow keys (←/→) or click the tab with the mouse
4. **Select Item**: Press Enter or click to copy to clipboard
5. **Delete Item**: Press Delete key
6. **Search**: Start typing to filter items
7. **Bookmark Item**: Press `Ctrl+B` to pin an item to Marcadores
8. **Close**: Press Esc or click outside

### Marcadores (Bookmarks)

The **Marcadores** tab lets you pin items permanently so they're always accessible, regardless of the history limit.

| Action | Result |
|--------|--------|
| `Ctrl+B` on Recientes | Pins the item to Marcadores |
| `Ctrl+B` on Marcadores | Unpins the item (returns to Recientes) |
| `Delete` on Marcadores | Removes the pin (item stays in Recientes) |
| `Enter` / click on Marcadores | Copies to clipboard and adds a copy to Recientes |
| `←` / `→` or mouse click | Switch between tabs |

## File Structure

```
gclip@Geomoon.dev/
├── extension.js          # Main extension entry point, handles enable/disable
├── clipboardManager.js   # Core clipboard monitoring and history management
├── clipboardPopup.js     # UI popup window with tabs, search and navigation
├── prefs.js             # Settings/preferences UI
├── metadata.json        # Extension metadata and version info
├── stylesheet.css       # Popup styling and theming
├── schemas/             # GSettings configuration schemas
│   └── org.gnome.shell.extensions.gclip.gschema.xml
└── README.md           # This file
```

## Data Storage

Clipboard data is stored in `~/.cache/gclip@Geomoon.dev/`:
- `clipboard-history.json`: All entries (text, image metadata, bookmark status)
- Images are stored as hashed files in the same directory

## Configuration

Open extension preferences:
```bash
gnome-extensions prefs gclip@Geomoon.dev
```

Settings:
- **Max History Items**: Number of recent items to keep (default: 100). Bookmarked items are not affected by this limit.
- **Keyboard Shortcut**: Change the keybinding (default: `Super+Shift+V`). Click "Change" and press your desired combination.
- **Clear History**: Delete all saved clipboard data

## Requirements

- GNOME Shell 45, 46, 47, or 48
- Wayland or X11

## Technical Details

- **Language**: JavaScript (GJS)
- **Storage**: JSON file + image files (hash-named)
- **Clipboard Access**: Native `St.Clipboard` API
- **Monitoring**: Event-driven via `Meta.Display` selection owner-changed signal
- **Duplicate Detection**: Content comparison for text; hash-based for images
- **Bookmarks**: Stored as `favorite: true` in the same history JSON; excluded from the item limit

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
- Change it in extension preferences (`gnome-extensions prefs gclip@Geomoon.dev`)

**Images not saving:**
- Check permissions on `~/.cache/gclip@Geomoon.dev/`
- Ensure disk space is available

## Changelog

### v2
- Added **Marcadores** tab for permanently pinned items
- `Ctrl+B` to bookmark/unbookmark items
- `←/→` keyboard navigation and mouse click to switch tabs
- Default keybinding changed to `Super+Shift+V` to avoid GNOME system shortcut conflict
- Functional keyboard shortcut editor in preferences
- Sequential item numbering per tab
- Fixed item selection bug when using search filter
- Fixed image file cleanup on item delete
- Added GNOME Shell 47 and 48 support

### v1
- Initial release

## License

MIT License

## Author

Created for efficient clipboard management on GNOME/Wayland
