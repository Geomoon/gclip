import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {ClipboardManager} from './clipboardManager.js';
import {ClipboardPopup} from './clipboardPopup.js';

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
        
        log('GClip extension enabled');
    }

    disable() {
        Main.wm.removeKeybinding('show-clipboard-popup');
        
        if (this._clipboardManager) {
            this._clipboardManager.destroy();
            this._clipboardManager = null;
        }
        
        if (this._popup) {
            this._popup.destroy();
            this._popup = null;
        }
        
        this._settings = null;
        
        log('GClip extension disabled');
    }

    _showPopup() {
        if (this._popup) {
            this._popup.destroy();
        }
        
        const history = this._clipboardManager.getHistory();
        this._popup = new ClipboardPopup(history, this._clipboardManager);
        this._popup.open();
    }
}
