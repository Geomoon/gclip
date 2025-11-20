import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Cogl from 'gi://Cogl';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const MAX_PREVIEW_LENGTH = 60;
const POPUP_WIDTH = 400;
const POPUP_HEIGHT = 300;

export const ClipboardPopup = GObject.registerClass(
class ClipboardPopup extends St.Widget {
    _init(history, clipboardManager) {
        super._init({
            reactive: true,
            can_focus: true,
            track_hover: true
        });

        this._history = history;
        this._clipboardManager = clipboardManager;
        this._selectedIndex = 0;

        this._buildUI();
        this._populateList();
        
        // Añadir al layout manager
        Main.layoutManager.addTopChrome(this);
        this._positionPopup();
        
        // Capturar eventos globales
        this._capturedEventId = global.stage.connect('captured-event', 
            this._onCapturedEvent.bind(this));
    }

    _positionPopup() {
        // Obtener posición del cursor
        let [x, y] = global.get_pointer();
        let monitor = Main.layoutManager.currentMonitor;
        
        // Ajustar para que no se salga de la pantalla
        x = Math.min(x, monitor.x + monitor.width - POPUP_WIDTH - 20);
        y = Math.min(y, monitor.y + monitor.height - POPUP_HEIGHT - 20);
        x = Math.max(x, monitor.x + 20);
        y = Math.max(y, monitor.y + 20);
        
        this.set_position(x, y);
        this.set_size(POPUP_WIDTH, POPUP_HEIGHT);
    }

    _buildUI() {
        // Contenedor principal con fondo
        let mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'gclip-popup',
            width: POPUP_WIDTH,
            height: POPUP_HEIGHT
        });

        // Barra de búsqueda
        this._searchEntry = new St.Entry({
            style_class: 'gclip-search-entry',
            hint_text: 'Search...',
            can_focus: true,
            x_expand: true
        });

        this._searchEntry.clutter_text.connect('text-changed', () => {
            this._filterList();
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

        scrollView.add_child(this._listBox);
        mainBox.add_child(scrollView);

        // Footer con instrucciones
        let footer = new St.Label({
            text: '↑↓: Navigate  |  Enter: Select  |  Del: Delete  |  Esc: Close',
            style_class: 'gclip-footer'
        });
        mainBox.add_child(footer);

        this.add_child(mainBox);
    }
    
    _onCapturedEvent(actor, event) {
        if (event.type() === Clutter.EventType.KEY_PRESS) {
            return this._onKeyPress(event);
        }
        
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            // Cerrar si click fuera del popup
            let [x, y] = event.get_coords();
            let [popupX, popupY] = this.get_position();
            let [popupW, popupH] = this.get_size();
            
            if (x < popupX || x > popupX + popupW || 
                y < popupY || y > popupY + popupH) {
                this.close();
                return Clutter.EVENT_STOP;
            }
        }
        
        return Clutter.EVENT_PROPAGATE;
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

        if (item.mimetype === 'text/plain;charset=utf-8') {
            // Preview del texto
            let preview = item.contents.replace(/\n/g, ' ').substring(0, MAX_PREVIEW_LENGTH);
            if (item.contents.length > MAX_PREVIEW_LENGTH) {
                preview += '...';
            }

            let label = new St.Label({
                text: preview,
                style_class: 'gclip-item-text',
                x_expand: true
            });
            itemBox.add_child(label);

        } else if (item.mimetype && item.mimetype.startsWith('image/')) {
            // Previsualización de la imagen
            let thumbnail = this._createImageThumbnail(item.contents);
            if (thumbnail) {
                itemBox.add_child(thumbnail);
            } else {
                // Fallback: icono si falla la carga
                let icon = new St.Icon({
                    icon_name: 'image-x-generic-symbolic',
                    style_class: 'gclip-item-icon',
                    icon_size: 32
                });
                itemBox.add_child(icon);
            }

            // Info de la imagen
            let label = new St.Label({
                text: `Image`,
                style_class: 'gclip-item-text',
                x_expand: true
            });
            itemBox.add_child(label);
        }

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

    _createImageThumbnail(imagePath) {
        try {
            let file = Gio.File.new_for_path(imagePath);
            if (!file.query_exists(null)) {
                return null;
            }

            // Cargar imagen y crear miniatura
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                imagePath,
                48,  // ancho máximo
                48,  // alto máximo
                true // mantener aspecto
            );

            let image = new St.Icon({
                gicon: Gio.FileIcon.new(file),
                icon_size: 32,
                style_class: 'gclip-item-thumbnail'
            });

            // Usar Clutter.Image para mostrar el pixbuf
            let clutterImage = new Clutter.Image();
            clutterImage.set_data(
                pixbuf.get_pixels(),
                pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
                pixbuf.get_width(),
                pixbuf.get_height(),
                pixbuf.get_rowstride()
            );

            let imageWidget = new St.Widget({
                width: 32,
                height: 32,
                style_class: 'gclip-item-thumbnail',
                content: clutterImage
            });

            return imageWidget;
        } catch (e) {
            log(`Error creating thumbnail: ${e}`);
            return null;
        }
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
            if (item.mimetype === 'text/plain;charset=utf-8') {
                return item.contents.toLowerCase().includes(searchText);
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
        this.show();
        this.opacity = 0;
        this.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD
        });
        global.stage.set_key_focus(this._searchEntry);
    }
    
    close() {
        if (this._closing) return;
        this._closing = true;
        
        if (this._capturedEventId) {
            global.stage.disconnect(this._capturedEventId);
            this._capturedEventId = null;
        }
        
        this.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                try {
                    Main.layoutManager.removeChrome(this);
                } catch(e) {
                    // Ya fue removido
                }
            }
        });
    }
});
