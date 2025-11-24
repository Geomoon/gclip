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
            subtitle: 'Current: <Super>V'
        });

        const shortcutButton = new Gtk.Button({
            label: 'Change Shortcut',
            valign: Gtk.Align.CENTER
        });

        shortcutButton.connect('clicked', () => {
            // Aquí se implementaría un diálogo para cambiar el shortcut
            // Por simplicidad, dejamos el valor por defecto
        });

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
