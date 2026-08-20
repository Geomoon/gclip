import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Cogl from 'gi://Cogl';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const MAX_PREVIEW_LENGTH = 60;
const POPUP_WIDTH = 400;
const POPUP_HEIGHT = 350;

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
        this._keyboardMode = false;
        this._activeTab = 'recent';

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

        // Tab bar
        let tabBar = new St.BoxLayout({
            style_class: 'gclip-tab-bar',
            vertical: false,
            x_expand: true
        });

        this._tabRecent = new St.Label({
            text: 'Recientes',
            style_class: 'gclip-tab active',
            x_expand: true,
            reactive: true,
            track_hover: true
        });
        this._tabBookmarks = new St.Label({
            text: 'Marcadores',
            style_class: 'gclip-tab',
            x_expand: true,
            reactive: true,
            track_hover: true
        });

        this._tabRecent.connect('button-press-event', () => {
            if (this._activeTab !== 'recent') this._switchTab();
            return Clutter.EVENT_STOP;
        });
        this._tabBookmarks.connect('button-press-event', () => {
            if (this._activeTab !== 'bookmarks') this._switchTab();
            return Clutter.EVENT_STOP;
        });

        tabBar.add_child(this._tabRecent);
        tabBar.add_child(this._tabBookmarks);
        mainBox.add_child(tabBar);

        // ScrollView para la lista
        this._scrollView = new St.ScrollView({
            style_class: 'gclip-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            y_expand: true
        });

        this._listBox = new St.BoxLayout({
            vertical: true,
            style_class: 'gclip-list-box'
        });

        this._scrollView.add_child(this._listBox);
        mainBox.add_child(this._scrollView);

        // Footer con instrucciones
        let footer = new St.Label({
            text: '↑↓ Nav  |  ←→ Tab  |  Enter Sel  |  Ctrl+B Marcar  |  Del  |  Esc',
            style_class: 'gclip-footer'
        });
        mainBox.add_child(footer);

        this.add_child(mainBox);
    }
    
    _onCapturedEvent(actor, event) {
        if (event.type() === Clutter.EventType.KEY_PRESS) {
            return this._onKeyPress(event);
        }
        
        if (event.type() === Clutter.EventType.MOTION) {
            // Desactivar modo teclado cuando se mueve el mouse
            this._keyboardMode = false;
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

    _getDisplayItems() {
        return this._history
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => this._activeTab === 'recent' ? !item.favorite : !!item.favorite);
    }

    _populateList() {
        this._listBox.destroy_all_children();
        this._items = [];

        const displayItems = this._getDisplayItems();

        if (displayItems.length === 0) {
            const msg = this._activeTab === 'recent'
                ? 'No clipboard history yet'
                : 'No hay marcadores aún  (Ctrl+B para marcar)';
            let emptyLabel = new St.Label({
                text: msg,
                style_class: 'gclip-empty-label'
            });
            this._listBox.add_child(emptyLabel);
            return;
        }

        displayItems.forEach(({ item, index }, displayPos) => {
            let itemWidget = this._createItemWidget(item, index, displayPos);
            this._listBox.add_child(itemWidget);
            this._items.push(itemWidget);
        });

        this._updateSelection();
    }

    _createItemWidget(item, index, displayIndex = index) {
        let itemBox = new St.BoxLayout({
            style_class: 'gclip-item',
            vertical: false,
            reactive: true,
            track_hover: true,
            x_expand: true
        });

        // Índice del item
        let indexLabel = new St.Label({
            text: `${displayIndex + 1}`,
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

        // Store original history index on the widget
        itemBox._historyIndex = index;

        // Event handlers
        itemBox.connect('button-press-event', () => {
            this._selectedIndex = this._items.indexOf(itemBox);
            this._selectItem(itemBox._historyIndex);
            return Clutter.EVENT_STOP;
        });

        itemBox.connect('enter-event', () => {
            // Desactivar modo teclado cuando el mouse se mueve
            this._keyboardMode = false;
            this._selectedIndex = this._items.indexOf(itemBox);
            this._updateSelection();
        });
        
        itemBox.connect('motion-event', () => {
            // También desactivar con movimiento del mouse
            this._keyboardMode = false;
            return Clutter.EVENT_PROPAGATE;
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
           console.debug(`Error creating thumbnail: ${e}`);
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

        const filtered = this._getDisplayItems().filter(({ item }) => {
            if (item.mimetype === 'text/plain;charset=utf-8') {
                return item.contents.toLowerCase().includes(searchText);
            }
            return false;
        });

        if (filtered.length === 0) {
            let emptyLabel = new St.Label({
                text: 'No matches found',
                style_class: 'gclip-empty-label'
            });
            this._listBox.add_child(emptyLabel);
            return;
        }

        filtered.forEach(({ item, index }, displayPos) => {
            let itemWidget = this._createItemWidget(item, index, displayPos);
            this._listBox.add_child(itemWidget);
            this._items.push(itemWidget);
        });

        this._selectedIndex = 0;
        this._updateSelection();
    }

    _switchTab() {
        this._activeTab = this._activeTab === 'recent' ? 'bookmarks' : 'recent';
        this._selectedIndex = 0;
        this._searchEntry.set_text('');
        this._updateTabBar();
        this._populateList();
    }

    _updateTabBar() {
        if (this._activeTab === 'recent') {
            this._tabRecent.add_style_class_name('active');
            this._tabBookmarks.remove_style_class_name('active');
        } else {
            this._tabBookmarks.add_style_class_name('active');
            this._tabRecent.remove_style_class_name('active');
        }
    }

    _updateSelection() {
        this._items.forEach((item, index) => {
            if (index === this._selectedIndex) {
                item.add_style_class_name('selected');
                
                // Hacer scroll automático para mantener el item visible
                this._scrollToItem(item);
            } else {
                item.remove_style_class_name('selected');
            }
        });
    }
    
    _scrollToItem(item) {
        if (!this._scrollView || !this._keyboardMode) return;
        
        const adjustment = this._scrollView.get_vscroll_bar().get_adjustment();
        const pageSize = adjustment.page_size;
        const value = adjustment.value;

        const box = item.get_allocation_box();
        const itemY = box.y1;
        const itemHeight = box.y2 - itemY;

        const margin = 10; // Margen para mejor visibilidad

        if (itemY < value + margin) {
            // Item está arriba, scroll hacia arriba
            adjustment.value = Math.max(0, itemY - margin);
        } else if (itemY + itemHeight > value + pageSize - margin) {
            // Item está abajo, scroll hacia abajo
            adjustment.value = Math.min(
                adjustment.upper - pageSize,
                itemY + itemHeight - pageSize + margin
            );
        }
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        const state = event.get_state();
        const ctrl = (state & Clutter.ModifierType.CONTROL_MASK) !== 0;

        if (symbol === Clutter.KEY_Up) {
            this._keyboardMode = true;
            this._selectedIndex = Math.max(0, this._selectedIndex - 1);
            this._updateSelection();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Down) {
            this._keyboardMode = true;
            this._selectedIndex = Math.min(this._items.length - 1, this._selectedIndex + 1);
            this._updateSelection();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Right) {
            this._keyboardMode = true;
            this._switchTab();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
            const item = this._items[this._selectedIndex];
            if (item) this._selectItem(item._historyIndex);
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Delete || symbol === Clutter.KEY_KP_Delete) {
            const item = this._items[this._selectedIndex];
            if (item) this._deleteItem(item._historyIndex);
            return Clutter.EVENT_STOP;
        }

        if (ctrl && (symbol === Clutter.KEY_b || symbol === Clutter.KEY_B)) {
            const item = this._items[this._selectedIndex];
            if (item) {
                if (this._activeTab === 'recent') {
                    this._clipboardManager.addBookmark(item._historyIndex);
                } else {
                    this._clipboardManager.removeBookmark(item._historyIndex);
                }
                this._selectedIndex = 0;
                this._populateList();
            }
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
        if (index < 0 || index >= this._history.length) return;

        if (this._activeTab === 'bookmarks') {
            this._clipboardManager.removeBookmark(index);
        } else {
            this._clipboardManager.deleteItem(index);
        }

        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this._populateList();
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
                Main.layoutManager.removeChrome(this);
            }
        });
    }
});
