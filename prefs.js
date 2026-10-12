import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Valores de la clave popup-theme, en el orden en que se muestran
const POPUP_THEMES = [
    ['system', 'Follow System'],
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['darker', 'Darker']
];

export default class GClipPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Página principal
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Grupo de configuración general
        const generalGroup = new Adw.PreferencesGroup({
            title: 'General Settings',
            description: 'Configure clipboard history behavior'
        });
        page.add(generalGroup);

        // Max history items
        const maxItemsRow = new Adw.SpinRow({
            title: 'Maximum History Items',
            subtitle: 'Number of items to keep in clipboard history',
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 1000,
                step_increment: 10,
                page_increment: 100,
                value: settings.get_int('max-history-items')
            })
        });

        maxItemsRow.connect('notify::value', (widget) => {
            settings.set_int('max-history-items', widget.value);
        });

        generalGroup.add(maxItemsRow);

        // Private mode
        const privateRow = new Adw.SwitchRow({
            title: 'Private Mode',
            subtitle: 'While enabled, nothing you copy is saved to the history'
        });
        settings.bind('private-mode', privateRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(privateRow);

        // Appearance
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance'
        });
        page.add(appearanceGroup);

        const themeRow = new Adw.ComboRow({
            title: 'Popup Theme',
            subtitle: 'Colors used by the clipboard popup',
            model: Gtk.StringList.new(POPUP_THEMES.map(([, label]) => label))
        });
        themeRow.selected = Math.max(0, POPUP_THEMES.findIndex(
            ([value]) => value === settings.get_string('popup-theme')));
        themeRow.connect('notify::selected', (widget) => {
            settings.set_string('popup-theme', POPUP_THEMES[widget.selected][0]);
        });
        appearanceGroup.add(themeRow);

        // Keyboard shortcut
        const shortcutGroup = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcut',
            description: 'Shortcut to open clipboard popup'
        });
        page.add(shortcutGroup);

        this._addShortcutRow(window, shortcutGroup, settings,
            'show-clipboard-popup', 'Show Clipboard Popup');
        this._addShortcutRow(window, shortcutGroup, settings,
            'toggle-private-mode', 'Toggle Private Mode');

        // Storage group
        const storageGroup = new Adw.PreferencesGroup({
            title: 'Storage',
            description: 'Manage clipboard history data'
        });
        page.add(storageGroup);

        const clearButton = new Gtk.Button({
            label: 'Clear All History',
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action']
        });

        clearButton.connect('clicked', () => {
            // Mostrar diálogo de confirmación
            const dialog = new Gtk.MessageDialog({
                transient_for: window,
                modal: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                text: 'Clear all clipboard history?',
                secondary_text: 'This will delete all saved clipboard items including images. This action cannot be undone.'
            });

            dialog.connect('response', (dialog, response) => {
                if (response === Gtk.ResponseType.YES) {
                    // TODO: Implementar limpieza
                   console.debug('Clearing clipboard history...');
                }
                dialog.destroy();
            });

            dialog.show();
        });

        const clearRow = new Adw.ActionRow({
            title: 'Clear History',
            subtitle: 'Delete all clipboard history and images'
        });
        clearRow.add_suffix(clearButton);
        storageGroup.add(clearRow);
    }

    _addShortcutRow(window, group, settings, key, title) {
        const shortcutRow = new Adw.ActionRow({
            title,
            subtitle: 'Click "Change" and press your desired key combination'
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: 'Not set',
            valign: Gtk.Align.CENTER
        });

        const updateShortcutLabel = () => {
            const shortcuts = settings.get_strv(key);
            shortcutLabel.set_accelerator(shortcuts.length > 0 ? shortcuts[0] : '');
        };
        updateShortcutLabel();
        settings.connect(`changed::${key}`, updateShortcutLabel);

        const shortcutButton = new Gtk.Button({
            label: 'Change',
            valign: Gtk.Align.CENTER
        });

        shortcutButton.connect('clicked', () => {
            const dialog = new Gtk.Window({
                title: 'Set Keyboard Shortcut',
                transient_for: window,
                modal: true,
                default_width: 320,
                default_height: 140,
                resizable: false
            });

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER
            });

            box.append(new Gtk.Label({
                label: '<b>Press a key combination...</b>',
                use_markup: true
            }));
            box.append(new Gtk.Label({
                label: 'Escape to cancel, Backspace to clear',
                css_classes: ['dim-label']
            }));

            dialog.set_child(box);

            const keyController = new Gtk.EventControllerKey();
            keyController.connect('key-pressed', (_ctrl, keyval, _keycode, state) => {
                if (keyval === Gdk.KEY_Escape) {
                    dialog.close();
                    return true;
                }

                if (keyval === Gdk.KEY_BackSpace) {
                    settings.set_strv(key, []);
                    dialog.close();
                    return true;
                }

                const mods = state & Gtk.accelerator_get_default_mod_mask();
                if (!Gtk.accelerator_valid(keyval, mods)) return false;

                const accelerator = Gtk.accelerator_name(keyval, mods);
                if (accelerator) {
                    settings.set_strv(key, [accelerator]);
                    dialog.close();
                }
                return true;
            });

            dialog.add_controller(keyController);
            dialog.present();
        });

        shortcutRow.add_suffix(shortcutLabel);
        shortcutRow.add_suffix(shortcutButton);
        group.add(shortcutRow);
    }
}
