package listen

import (
	"log"

	"github.com/gotk3/gotk3/gdk"
	"github.com/gotk3/gotk3/gtk"
)

type ClipboardMonitor struct {
	clipboard *gtk.Clipboard
	onChanged func(string)
	lastText  string
}

// NewClipboardMonitor crea un nuevo monitor del portapapeles
func NewClipboardMonitor(onChanged func(string)) *ClipboardMonitor {
	gtk.Init(nil)

	// Obtener el portapapeles por defecto
	clipboard, err := gtk.ClipboardGet(gdk.SELECTION_CLIPBOARD)
	if err != nil {
		log.Panicln("Unable to get clipboard:", err)
	}

	monitor := &ClipboardMonitor{
		clipboard: clipboard,
		onChanged: onChanged,
		lastText:  "",
	}

	return monitor
}

// Start inicia el monitoreo del portapapeles
func (cm *ClipboardMonitor) Start() {
	// Conectar al evento owner-change que se dispara cuando cambia el contenido del portapapeles
	cm.clipboard.Connect("owner-change", func() {
		cm.checkClipboard()
	})

	log.Println("Clipboard monitor started. Listening for clipboard changes...")

	// Iniciar el loop principal de GTK
	gtk.Main()
}

// checkClipboard verifica el contenido actual del portapapeles
func (cm *ClipboardMonitor) checkClipboard() {
	// Solicitar el texto del portapapeles
	text, err := cm.clipboard.WaitForText()
	if err != nil {
		log.Println("Error getting clipboard text:", err)
		return
	}

	// Solo notificar si el texto ha cambiado
	if text != "" && text != cm.lastText {
		cm.lastText = text
		log.Printf("Clipboard changed: %s\n", text)

		if cm.onChanged != nil {
			cm.onChanged(text)
		}
	}
}

// Stop detiene el monitoreo del portapapeles
func (cm *ClipboardMonitor) Stop() {
	gtk.MainQuit()
}

// GetCurrentText obtiene el texto actual del portapapeles
func (cm *ClipboardMonitor) GetCurrentText() (string, error) {
	return cm.clipboard.WaitForText()
}
