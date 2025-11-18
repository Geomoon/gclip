import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const HISTORY_DIR = GLib.build_filenamev([
    GLib.get_user_data_dir(),
    'gclip'
]);
const HISTORY_FILE = GLib.build_filenamev([HISTORY_DIR, 'history.json']);
const IMAGES_DIR = GLib.build_filenamev([HISTORY_DIR, 'images']);

export class ClipboardManager {
    constructor(settings) {
        this._settings = settings;
        this._clipboard = St.Clipboard.get_default();
        this._history = [];
        this._maxItems = settings.get_int('max-history-items');
        this._lastText = '';
        this._lastImageHash = '';
        
        this._ensureDirectories();
        this._loadHistory();
        this._startMonitoring();
    }

    _ensureDirectories() {
        [HISTORY_DIR, IMAGES_DIR].forEach(dir => {
            let file = Gio.File.new_for_path(dir);
            try {
                if (!file.query_exists(null)) {
                    file.make_directory_with_parents(null);
                }
            } catch (e) {
                log(`Error creating directory ${dir}: ${e}`);
            }
        });
    }

    _startMonitoring() {
        // Monitorear cambios en el portapapeles cada 500ms
        this._monitorId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._checkClipboard();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _checkClipboard() {
        // Intentar obtener texto
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text && text.trim() && text !== this._lastText) {
                this._lastText = text;
                this._addToHistory({
                    type: 'text',
                    content: text,
                    timestamp: Date.now()
                });
            }
        });

        // Intentar obtener imagen (PNG)
        this._clipboard.get_content(St.ClipboardType.CLIPBOARD, 'image/png', (clipboard, bytes) => {
            if (bytes && bytes.length > 0) {
                const hash = this._hashBytes(bytes);
                if (hash !== this._lastImageHash) {
                    this._lastImageHash = hash;
                    this._saveImage(bytes);
                }
            }
        });
    }

    _hashBytes(bytes) {
        // Simple hash para detectar imágenes duplicadas
        let hash = 0;
        for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
            hash = ((hash << 5) - hash) + bytes[i];
            hash = hash & hash;
        }
        return hash.toString();
    }

    _saveImage(bytes) {
        const filename = `${Date.now()}.png`;
        const filepath = GLib.build_filenamev([IMAGES_DIR, filename]);
        
        try {
            let file = Gio.File.new_for_path(filepath);
            file.replace_contents(
                bytes,
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );

            // Crear miniatura
            const thumbPath = this._createThumbnail(filepath);

            this._addToHistory({
                type: 'image',
                filename: filename,
                path: filepath,
                thumbnail: thumbPath,
                size: bytes.length,
                timestamp: Date.now()
            });
        } catch (e) {
            log(`Error saving image: ${e}`);
        }
    }

    _createThumbnail(imagePath) {
        // Aquí podrías usar GdkPixbuf para crear miniaturas
        // Por simplicidad, usamos la imagen original
        return imagePath;
    }

    _addToHistory(item) {
        // Evitar duplicados inmediatos
        const last = this._history[0];
        if (last) {
            if (last.type === 'text' && item.type === 'text' && 
                last.content === item.content) {
                return;
            }
            if (last.type === 'image' && item.type === 'image' &&
                last.filename === item.filename) {
                return;
            }
        }

        this._history.unshift(item);
        
        // Mantener límite y limpiar archivos viejos
        while (this._history.length > this._maxItems) {
            const removed = this._history.pop();
            if (removed.type === 'image') {
                this._deleteImageFile(removed.path);
            }
        }

        this._saveHistory();
    }

    _deleteImageFile(path) {
        try {
            let file = Gio.File.new_for_path(path);
            if (file.query_exists(null)) {
                file.delete(null);
            }
        } catch (e) {
            log(`Error deleting image: ${e}`);
        }
    }

    _saveHistory() {
        try {
            let file = Gio.File.new_for_path(HISTORY_FILE);
            file.replace_contents(
                JSON.stringify(this._history, null, 2),
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
        } catch (e) {
            log(`Error saving history: ${e}`);
        }
    }

    _loadHistory() {
        try {
            let file = Gio.File.new_for_path(HISTORY_FILE);
            if (file.query_exists(null)) {
                let [success, contents] = file.load_contents(null);
                if (success) {
                    this._history = JSON.parse(new TextDecoder().decode(contents));
                    // Limpiar referencias a imágenes que ya no existen
                    this._history = this._history.filter(item => {
                        if (item.type === 'image') {
                            let imgFile = Gio.File.new_for_path(item.path);
                            return imgFile.query_exists(null);
                        }
                        return true;
                    });
                }
            }
        } catch (e) {
            log(`Error loading history: ${e}`);
            this._history = [];
        }
    }

    getHistory() {
        return this._history;
    }

    copyToClipboard(item) {
        if (item.type === 'text') {
            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, item.content);
        } else if (item.type === 'image') {
            try {
                let file = Gio.File.new_for_path(item.path);
                let [success, contents] = file.load_contents(null);
                if (success) {
                    this._clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/png', contents);
                }
            } catch (e) {
                log(`Error copying image to clipboard: ${e}`);
            }
        }
    }

    clearHistory() {
        // Eliminar todas las imágenes
        this._history.forEach(item => {
            if (item.type === 'image') {
                this._deleteImageFile(item.path);
            }
        });
        
        this._history = [];
        this._saveHistory();
    }

    deleteItem(index) {
        if (index >= 0 && index < this._history.length) {
            const item = this._history[index];
            if (item.type === 'image') {
                this._deleteImageFile(item.path);
            }
            this._history.splice(index, 1);
            this._saveHistory();
        }
    }

    destroy() {
        if (this._monitorId) {
            GLib.source_remove(this._monitorId);
            this._monitorId = null;
        }
    }
}
