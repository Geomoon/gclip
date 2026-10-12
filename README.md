# GClip - GNOME Clipboard Manager

A lightweight clipboard manager extension for GNOME Shell with a Windows-style popup interface. Fully compatible with Wayland.

## Features

<img width="770" height="433" alt="image" src="https://github.com/user-attachments/assets/c696446b-7722-4135-8d45-c2b1093ff4f8" />


- 📋 **Text & Image Support**: Manages both text and image clipboard history
- ⚡ **Quick Access**: Open with `Super+Shift+V` (configurable)
- 🔍 **Search**: Filter clipboard history with fuzzy search
- 💾 **Persistent Storage**: Keeps history across sessions
- 🖼️ **Image Management**: Automatically saves and manages clipboard images
- 🎨 **Clean UI**: Compact popup that follows the GNOME Shell theme, with light, dark and darker themes
- ⌨️ **Keyboard Navigation**: Full keyboard control (arrow keys, Enter, Delete, Esc)
- 📌 **Bookmarks**: Pin items permanently outside the history limit
- 🔒 **Private mode**: Pause history recording while you copy sensitive data

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
7. **Bookmark Item**: Press `Ctrl+B` to pin an item to Bookmarks
8. **Close**: Press Esc or click outside

### Bookmarks

The **Bookmarks** tab lets you pin items permanently so they're always accessible, regardless of the history limit.

| Action | Result |
|--------|--------|
| `Ctrl+B` on Recent | Pins the item to Bookmarks |
| `Ctrl+B` on Bookmarks | Unpins the item (returns to Recent) |
| `Delete` on Bookmarks | Removes the pin (item stays in Recent) |
| `Enter` / click on Bookmarks | Copies to clipboard and adds a copy to Recent |
| `←` / `→` or mouse click | Switch between tabs |

### Private Mode

While private mode is on, GClip does not read or save anything you copy. The item list is hidden in the popup while it is active, and the setting persists across sessions.

| Action | Result |
|--------|--------|
| `Ctrl+P` in the popup, or click the switch in the footer | Toggles private mode |
| Preferences → **Private Mode** | Toggles private mode |
| Global shortcut (unset by default) | Toggles private mode from anywhere |

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
- **Private Mode**: Switch to stop recording, plus an optional global shortcut to toggle it. In the shortcut dialog, `Backspace` clears the shortcut.
- **Popup Theme**: Follow System (default), Light, Dark, or Darker (the dark theme with GClip's original, darker backgrounds).
- **Clear History**: Delete all saved clipboard data

The gear button at the end of the popup's footer opens these preferences.

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

### v3
- **Private mode**: pause history recording from the popup (`Ctrl+P` or the footer switch), the preferences, or an optional global shortcut
- Redesigned popup that follows the GNOME Shell theme (light/dark style and accent color), with a compact layout
- **Popup Theme** setting: Follow System, Light, Dark, or Darker
- Bookmark and delete buttons on each item when hovering it
- Search entry with clear button, empty-state placeholders, and shortcut hints in the footer
- Settings button moved to the popup footer
- Popup text unified to English
- Added GNOME Shell 49 and 50 support

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
