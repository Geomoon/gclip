import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

const MAX_PREVIEW_LENGTH = 100;
const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 400;

export const ClipboardPopup = GObject.registerClass(
class ClipboardPopup extends ModalDialog.ModalDialog {
    _init(history, clipboardManager) {
        super._init({ styleClass: 'gclip-popup' });

        this._history = history;
        this._clipboardManager = clipboardManager;
        this._selectedIndex = 0;

        this._buildUI();
        this._populateList();
    }

    _buildUI() {
        // Contenedor principal
        let mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'gclip-main-box',
            width: POPUP_WIDTH,
            height: POPUP_HEIGHT
        });

        // Barra de búsqueda
        this._searchEntry = new St.Entry({
            style_class: 'gclip-search-entry',
            hint_text: 'Search clipboard history...',
            can_focus: true,
            x_expand: true
        });

        this._searchEntry.clutter_text.connect('text-changed', () => {
            this._filterList();
        });

        this._searchEntry.clutter_text.connect('key-press-event', (actor, event) => {
            return this._onKeyPress(event);
        });

        mainBox.add_child(this._searchEntry);

        // ScrollView para la lista
        let scrollView = new St.ScrollView({
            style_class: 'gclip-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            y_expand: true
        });

        this._listBox = new St.BoxLayout({
            vertical: true,
            style_class: 'gclip-list-box'
        });

        scrollView.add_actor(this._listBox);
        mainBox.add_child(scrollView);

        // Footer con instrucciones
        let footer = new St.Label({
            text: '↑↓: Navigate  |  Enter: Select  |  Del: Delete  |  Esc: Close',
            style_class: 'gclip-footer'
        });
        mainBox.add_child(footer);

        this.contentLayout.add_child(mainBox);

        // Dar foco al search entry
        this._searchEntry.grab_key_focus();
    }

    _populateList() {
        this._listBox.destroy_all_children();
        this._items = [];

        if (this._history.length === 0) {
            let emptyLabel = new St.Label({
                text: 'No clipboard history yet',
                style_class: 'gclip-empty-label'
            });
            this._listBox.add_child(emptyLabel);
            return;
        }

        this._history.forEach((item, index) => {
            let itemWidget = this._createItemWidget(item, index);
            this._listBox.add_child(itemWidget);
            this._items.push(itemWidget);
        });

        this._updateSelection();
    }

    _createItemWidget(item, index) {
        let itemBox = new St.BoxLayout({
            style_class: 'gclip-item',
            vertical: false,
            reactive: true,
            track_hover: true,
            x_expand: true
        });

        // Índice del item
        let indexLabel = new St.Label({
            text: `${index + 1}`,
            style_class: 'gclip-item-index'
        });
        itemBox.add_child(indexLabel);

        if (item.type === 'text') {
            // Preview del texto
            let preview = item.content.replace(/\n/g, ' ').substring(0, MAX_PREVIEW_LENGTH);
            if (item.content.length > MAX_PREVIEW_LENGTH) {
                preview += '...';
            }

            let label = new St.Label({
                text: preview,
                style_class: 'gclip-item-text',
                x_expand: true
            });
            itemBox.add_child(label);

        } else if (item.type === 'image') {
            // Icono de imagen
            let icon = new St.Icon({
                icon_name: 'image-x-generic-symbolic',
                style_class: 'gclip-item-icon',
                icon_size: 24
            });
            itemBox.add_child(icon);

            // Info de la imagen
            let sizeKB = Math.round(item.size / 1024);
            let label = new St.Label({
                text: `Image (${sizeKB} KB)`,
                style_class: 'gclip-item-text',
                x_expand: true
            });
            itemBox.add_child(label);
        }

        // Timestamp
        let date = new Date(item.timestamp);
        let timeStr = this._formatTime(date);
        let timeLabel = new St.Label({
            text: timeStr,
            style_class: 'gclip-item-time'
        });
        itemBox.add_child(timeLabel);

        // Event handlers
        itemBox.connect('button-press-event', () => {
            this._selectItem(index);
            return Clutter.EVENT_STOP;
        });

        itemBox.connect('enter-event', () => {
            this._selectedIndex = index;
            this._updateSelection();
        });

        return itemBox;
    }

    _formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }

    _filterList() {
        const searchText = this._searchEntry.get_text().toLowerCase();
        
        if (!searchText) {
            this._populateList();
            return;
        }

        this._listBox.destroy_all_children();
        this._items = [];

        const filtered = this._history.filter((item, index) => {
            if (item.type === 'text') {
                return item.content.toLowerCase().includes(searchText);
            }
            return false; // Por ahora no filtramos imágenes
        });

        if (filtered.length === 0) {
            let emptyLabel = new St.Label({
                text: 'No matches found',
                style_class: 'gclip-empty-label'
            });
            this._listBox.add_child(emptyLabel);
            return;
        }

        filtered.forEach((item, index) => {
            const originalIndex = this._history.indexOf(item);
            let itemWidget = this._createItemWidget(item, originalIndex);
            this._listBox.add_child(itemWidget);
            this._items.push(itemWidget);
        });

        this._selectedIndex = 0;
        this._updateSelection();
    }

    _updateSelection() {
        this._items.forEach((item, index) => {
            if (index === this._selectedIndex) {
                item.add_style_class_name('selected');
            } else {
                item.remove_style_class_name('selected');
            }
        });
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();

        if (symbol === Clutter.KEY_Up) {
            this._selectedIndex = Math.max(0, this._selectedIndex - 1);
            this._updateSelection();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Down) {
            this._selectedIndex = Math.min(this._items.length - 1, this._selectedIndex + 1);
            this._updateSelection();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
            this._selectItem(this._selectedIndex);
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Delete || symbol === Clutter.KEY_KP_Delete) {
            this._deleteItem(this._selectedIndex);
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Escape) {
            this.close();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _selectItem(index) {
        if (index >= 0 && index < this._history.length) {
            const item = this._history[index];
            this._clipboardManager.copyToClipboard(item);
            this.close();
        }
    }

    _deleteItem(index) {
        if (index >= 0 && index < this._history.length) {
            this._clipboardManager.deleteItem(index);
            this._history.splice(index, 1);
            this._populateList();
            this._selectedIndex = Math.min(this._selectedIndex, this._history.length - 1);
        }
    }

    open() {
        super.open();
        this._searchEntry.grab_key_focus();
    }
});
