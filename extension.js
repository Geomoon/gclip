import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {ClipboardManager} from './clipboardManager.js';
import {ClipboardPopup} from './clipboardPopup.js';

const PRIVATE_ICON = 'view-conceal-symbolic';

export default class GClipExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._clipboardManager = new ClipboardManager(this._settings);
        
        // Registrar keybinding (Super+V por defecto)
        Main.wm.addKeybinding(
            'show-clipboard-popup',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._showPopup()
        );

        // Atajo global para el modo privado (sin asignar por defecto)
        Main.wm.addKeybinding(
            'toggle-private-mode',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._togglePrivateMode()
        );
        
       console.debug('GClip extension enabled');
    }

    disable() {
        Main.wm.removeKeybinding('show-clipboard-popup');
        Main.wm.removeKeybinding('toggle-private-mode');
        
        if (this._clipboardManager) {
            this._clipboardManager.destroy();
            this._clipboardManager = null;
        }
        
        if (this._popup) {
            this._popup.destroy();
            this._popup = null;
        }
        
        this._settings = null;
        
       console.debug('GClip extension disabled');
    }

    _showPopup() {
        if (this._popup) {
            this._popup.destroy();
        }
        
        const history = this._clipboardManager.getHistory();
        this._popup = new ClipboardPopup(history, this._clipboardManager,
            this._settings, () => this.openPreferences());
        this._popup.open();
    }

    _togglePrivateMode() {
        const active = !this._settings.get_boolean('private-mode');
        this._settings.set_boolean('private-mode', active);

        const icon = Gio.ThemedIcon.new(PRIVATE_ICON);
        const label = active ? 'Private mode on' : 'Private mode off';
        const osd = Main.osdWindowManager;
        // showAll() existe en versiones recientes; show(monitor, ...) en las antiguas
        if (osd.showAll)
            osd.showAll(icon, label);
        else
            osd.show(-1, icon, label);
    }
}
