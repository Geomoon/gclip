import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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

        // Keyboard shortcut
        const shortcutGroup = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcut',
            description: 'Shortcut to open clipboard popup'
        });
        page.add(shortcutGroup);

        const shortcutRow = new Adw.ActionRow({
            title: 'Show Clipboard Popup',
            subtitle: 'Click "Change" and press your desired key combination'
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: 'Not set',
            valign: Gtk.Align.CENTER
        });

        const updateShortcutLabel = () => {
            const shortcuts = settings.get_strv('show-clipboard-popup');
            shortcutLabel.set_accelerator(shortcuts.length > 0 ? shortcuts[0] : '');
        };
        updateShortcutLabel();
        settings.connect('changed::show-clipboard-popup', updateShortcutLabel);

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
                label: 'Press Escape to cancel',
                css_classes: ['dim-label']
            }));

            dialog.set_child(box);

            const keyController = new Gtk.EventControllerKey();
            keyController.connect('key-pressed', (_ctrl, keyval, _keycode, state) => {
                if (keyval === Gtk.KEY_Escape) {
                    dialog.close();
                    return true;
                }

                const mods = state & Gtk.accelerator_get_default_mod_mask();
                if (!Gtk.accelerator_valid(keyval, mods)) return false;

                const accelerator = Gtk.accelerator_name(keyval, mods);
                if (accelerator) {
                    settings.set_strv('show-clipboard-popup', [accelerator]);
                    dialog.close();
                }
                return true;
            });

            dialog.add_controller(keyController);
            dialog.present();
        });

        shortcutRow.add_suffix(shortcutLabel);
        shortcutRow.add_suffix(shortcutButton);
        shortcutGroup.add(shortcutRow);

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
}
