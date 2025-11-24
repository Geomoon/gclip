import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';

const CACHE_DIR = GLib.build_filenamev([
    GLib.get_user_cache_dir(),
    'gclip@usuario.dev'
]);
const HISTORY_FILE = GLib.build_filenamev([CACHE_DIR, 'clipboard-history.json']);

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
        let dir = Gio.File.new_for_path(CACHE_DIR);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
    }

    _startMonitoring() {
        // Usar el sistema de eventos de Meta.Display en lugar de polling
        const metaDisplay = Shell.Global.get().get_display();
        const selection = metaDisplay.get_selection();
        
        this._selectionOwnerChangedId = selection.connect('owner-changed', 
            (selection, selectionType, selectionSource) => {
                // Solo procesar eventos del CLIPBOARD (no PRIMARY)
                if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD) {
                   console.debug('GClip: Clipboard owner changed, checking content...');
                    this._checkClipboard();
                }
            }
        );
        
       console.debug('GClip: Started monitoring clipboard with owner-changed event');
    }

    _checkClipboard() {
        // Intentar obtener contenido del clipboard con múltiples mimetypes
        const mimetypes = [
            "text/plain;charset=utf-8",
            "text/plain",
            'image/png',
            'image/jpeg',
            'image/jpg',
        ];

        for (let mimetype of mimetypes) {
            this._clipboard.get_content(St.ClipboardType.CLIPBOARD, mimetype, (clipboard, bytes) => {
                if (bytes && bytes.get_size && bytes.get_size() > 0) {
                    const size = bytes.get_size();
                    const data = bytes.get_data();
                    
                    if (mimetype.startsWith('text/')) {
                        // Es texto
                        const text = new TextDecoder().decode(data);
                        if (text && text.trim() && text !== this._lastText) {
                            this._lastText = text;
                            this._addToHistory({
                                favorite: false,
                                mimetype: 'text/plain;charset=utf-8',
                                contents: text
                            });
                        }
                    } else if (mimetype.startsWith('image/')) {
                        // Es imagen
                        const hash = this._hashBytes(data);
                        if (hash !== this._lastImageHash) {
                            this._lastImageHash = hash;
                            this._saveImage(data, mimetype);
                        }
                    }
                }
            });
        }
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

    _saveImage(data, mimetype) {
        const hash = Math.abs(parseInt(this._hashBytes(data)));
        const filepath = GLib.build_filenamev([CACHE_DIR, hash.toString()]);
        
        let file = Gio.File.new_for_path(filepath);
        file.replace_contents(
            data,
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );

        this._addToHistory({
            favorite: false,
            mimetype: mimetype,
            contents: filepath
        });
    }

    _addToHistory(item) {
        // Buscar si el item ya existe (por contenido)
        const existingIndex = this._history.findIndex(h => h.contents === item.contents);
        
        if (existingIndex !== -1) {
            // Si existe, removerlo para re-agregarlo al inicio
            const existing = this._history.splice(existingIndex, 1)[0];
            // Preservar el estado de favorito si existía
            item.favorite = existing.favorite;
        }

        // Agregar al inicio
        this._history.unshift(item);
        
        // Mantener límite y limpiar archivos viejos
        while (this._history.length > this._maxItems) {
            const removed = this._history.pop();
            if (removed.mimetype && removed.mimetype.startsWith('image/')) {
                this._deleteImageFile(removed.contents);
            }
        }

        this._saveHistory();
    }

    _deleteImageFile(path) {
        let file = Gio.File.new_for_path(path);
        if (file.query_exists(null)) {
            file.delete(null);
        }
    }

    _saveHistory() {
        let file = Gio.File.new_for_path(HISTORY_FILE);
        file.replace_contents(
            JSON.stringify(this._history, null, 2),
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );
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
                        if (item.mimetype && item.mimetype.startsWith('image/')) {
                            let imgFile = Gio.File.new_for_path(item.contents);
                            return imgFile.query_exists(null);
                        }
                        return true;
                    });
                }
            }
        } catch (e) {
           console.debug(`GClip: Error loading history: ${e}`);
            this._history = [];
        }
    }

    getHistory() {
        return this._history;
    }

    copyToClipboard(item) {
        if (item.mimetype === 'text/plain;charset=utf-8') {
            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, item.contents);
        } else if (item.mimetype && item.mimetype.startsWith('image/')) {
            let file = Gio.File.new_for_path(item.contents);
            let [success, bytes] = file.load_contents(null);
            if (success) {
                this._clipboard.set_content(St.ClipboardType.CLIPBOARD, item.mimetype, bytes);
            }
        }
    }

    clearHistory() {
        // Eliminar todas las imágenes
        this._history.forEach(item => {
            if (item.mimetype && item.mimetype.startsWith('image/')) {
                this._deleteImageFile(item.contents);
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
        if (this._selectionOwnerChangedId) {
            const metaDisplay = Shell.Global.get().get_display();
            const selection = metaDisplay.get_selection();
            selection.disconnect(this._selectionOwnerChangedId);
            this._selectionOwnerChangedId = null;
           console.debug('GClip: Stopped monitoring clipboard');
        }
    }
}
