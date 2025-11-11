#!/usr/bin/gjs

// filepath: gclip-listener.js

const { GLib, Gdk, Gio } = imports.gi;

imports.gi.versions.Gtk = '4.0';
const Gtk = imports.gi.Gtk;

// Usar el módulo system para ejecutar comandos sqlite3
const ByteArray = imports.byteArray;

class ClipboardMonitor {
    constructor() {
        this.clipboard = null;
        this.lastContent = '';
        // Obtener el directorio de datos del usuario de manera dinámica
        const dataDir = GLib.get_user_data_dir();
        const dbDir = GLib.build_filenamev([dataDir, 'gclip']);
        this.dbPath = GLib.build_filenamev([dbDir, 'gclip.db']);
        // Asegurar que el directorio existe
        GLib.mkdir_with_parents(dbDir, 0o755);
        this._initDatabase();
    }

    start() {
        try {
            // Inicializar GTK
            Gtk.init();
            // Obtener el clipboard del display por defecto
            const display = Gdk.Display.get_default();
            this.clipboard = display.get_clipboard();
            this._log('Clipboard monitor started');
            // Monitorear cambios en el clipboard
            this.clipboard.connect('changed', () => {
                this._onClipboardChange();
            });
            // Mantener el programa corriendo
            const loop = GLib.MainLoop.new(null, false);
            loop.run();
        } catch (e) {
            this._log(`Error: ${e.message}`);
            logError(e);
        }
    }

    _onClipboardChange() {
        this._readClipboard();
    }

    _readClipboard() {
        // Leer texto del clipboard
        this.clipboard.read_text_async(null, (clipboard, result) => {
            try {
                const text = clipboard.read_text_finish(result);
                if (text && text.trim() !== '' && text !== this.lastContent) {
                    this.lastContent = text;
                    const entry = {
                        content: text,
                        timestamp: Date.now(),
                        type: 'text'
                    };
                    this._addToHistory(entry);
                }
            } catch (e) {
                this._log(`Error reading clipboard: ${e.message}`);
            }
        });
    }

    _addToHistory(entry) {
        try {
            // Verificar si el contenido ya existe
            const checkCmd = `sqlite3 "${this.dbPath}" "SELECT COUNT(*) FROM clipboard_history WHERE content = '${this._escapeSQL(entry.content)}';"`;
            const [success, stdout] = GLib.spawn_command_line_sync(checkCmd);
            
            if (success) {
                const count = parseInt(ByteArray.toString(stdout).trim());
                
                if (count === 0) {
                    // Insertar nuevo registro (timestamp se genera automáticamente)
                    const insertCmd = `sqlite3 "${this.dbPath}" "INSERT INTO clipboard_history (content) VALUES ('${this._escapeSQL(entry.content)}');"`;
                    GLib.spawn_command_line_sync(insertCmd);
                    
                    // Mantener solo las últimas 100 entradas
                    const cleanupCmd = `sqlite3 "${this.dbPath}" "DELETE FROM clipboard_history WHERE id NOT IN (SELECT id FROM clipboard_history ORDER BY timestamp DESC LIMIT 100);"`;
                    GLib.spawn_command_line_sync(cleanupCmd);
                    
                    this._log(`Saved to database: ${entry.content.substring(0, 50)}...`);
                }
            }
        } catch (e) {
            this._log(`Error adding to history: ${e.message}`);
        }
    }

    _initDatabase() {
        try {
            // Crear la base de datos y la tabla si no existe
            const createTableCmd = `sqlite3 "${this.dbPath}" "CREATE TABLE IF NOT EXISTS clipboard_history (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);"`;
            const [success, stdout, stderr] = GLib.spawn_command_line_sync(createTableCmd);
            if (success) {
                this._log('Database initialized');
            } else {
                this._log(`Database init error: ${ByteArray.toString(stderr)}`);
            }
        } catch (e) {
            this._log(`Could not initialize database: ${e.message}`);
        }
    }

    _escapeSQL(text) {
        // Escapar comillas simples para SQL
        return text.replace(/'/g, "''");
    }

    _log(message) {
        const timestamp = new Date().toLocaleString();
        print(`[${timestamp}] ${message}`);
    }

    stop() {
        this._log('Clipboard monitor stopped');
        Gtk.main_quit();
    }
}

// Iniciar
const monitor = new ClipboardMonitor();

GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, 2, () => { // SIGINT
    monitor.stop();
    return GLib.SOURCE_REMOVE;
});

GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, 15, () => { // SIGTERM
    monitor.stop();
    return GLib.SOURCE_REMOVE;
});

monitor.start();