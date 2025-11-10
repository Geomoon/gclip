package ui

import (
	"gclip/pkg/data"
	"log"

	"github.com/gotk3/gotk3/gdk"
	"github.com/gotk3/gotk3/gtk"
)

type UI struct {
}

func NewUI() *UI {
	return &UI{}
}

func (ui *UI) Run() {

	gtk.Init(nil)
	win, err := gtk.WindowNew(gtk.WINDOW_POPUP)
	if err != nil {
		panic(err)
	}
	win.Connect("destroy", func() {
		log.Println("destroy")
		gtk.MainQuit()
	})
	win.AddEvents(int(gdk.KEY_PRESS_MASK))

	win.Connect("key-press-event", keyPressHandler)

	// Crear list
	list, err := gtk.ListBoxNew()
	if err != nil {
		log.Panicln("Unable to create listbox:", err)
	}

	// Crear un ScrolledWindow para el list
	scrolled, err := gtk.ScrolledWindowNew(nil, nil)
	if err != nil {
		log.Panicln("Unable to create scrolled window:", err)
	}
	scrolled.SetPolicy(gtk.POLICY_NEVER, gtk.POLICY_AUTOMATIC)
	scrolled.SetSizeRequest(200, 350)
	scrolled.Add(list)

	// Agregar scrolled directamente a la ventana
	win.Add(scrolled)

	win.SetResizable(false)
	win.SetKeepAbove(true)
	win.SetTypeHint(gdk.WINDOW_TYPE_HINT_TOOLTIP)
	// win.SetDecorated(false)
	win.SetSkipTaskbarHint(true)
	win.SetSkipPagerHint(true)
	win.SetAcceptFocus(true)
	win.SetFocusOnMap(true)

	for _, item := range data.Data {
		itemLabel, _ := gtk.LabelNew(item.Content)
		itemLabel.SetHAlign(gtk.ALIGN_START)
		list.Add(itemLabel)
	}

	// Configurar el tamaño de la ventana
	win.SetDefaultSize(200, 350)

	// Posicionar la ventana en la posición actual del cursor
	display, err := win.GetDisplay()
	if err != nil {
		log.Panicln("Unable to get display:", err)
	}
	seat, _ := display.GetDefaultSeat()
	pointer, _ := seat.GetPointer()
	screen, _ := display.GetDefaultScreen()
	var x, y int
	_ = pointer.GetPosition(&screen, &x, &y)

	list.Connect("row-selected", func(box *gtk.ListBox, row *gtk.ListBoxRow) {
		if row == nil {
			return
		}
		child, err := row.GetChild()
		if err != nil {
			log.Panicln("Unable to get child of selected row:", err)
		}
		label, ok := child.(*gtk.Label)
		if !ok {
			log.Panicln("Child is not a gtk.Label")
		}
		text, err := label.GetText()
		if err != nil {
			log.Panicln("Unable to get text from label:", err)
		}
		log.Println("Selected item content:", text)
	})

	// Obtener dimensiones de la pantalla
	monitor, err := display.GetMonitorAtPoint(x, y)
	if err != nil {
		log.Panicln("Unable to get monitor:", err)
	}
	geometry := monitor.GetGeometry()
	screenWidth := geometry.GetWidth()
	screenHeight := geometry.GetHeight()

	// Obtener dimensiones de la ventana
	winWidth, winHeight := win.GetSize()

	// Ajustar posición X para que no se salga por la derecha
	if x+winWidth > geometry.GetX()+screenWidth {
		x = geometry.GetX() + screenWidth - winWidth
	}
	// Ajustar posición X para que no se salga por la izquierda
	if x < geometry.GetX() {
		x = geometry.GetX()
	}

	// Ajustar posición Y para que no se salga por abajo
	if y+winHeight > geometry.GetY()+screenHeight {
		y = geometry.GetY() + screenHeight - winHeight
	}
	// Ajustar posición Y para que no se salga por arriba
	if y < geometry.GetY() {
		y = geometry.GetY()
	}

	win.Move(x, y)

	// Mostrar la ventana y todos sus widgets
	win.ShowAll()
	win.SetGravity(gdk.GDK_GRAVITY_CENTER)
	list.GrabFocus()

	gtk.Main()
}

// keyPressHandler es la función de callback para el evento "key-press-event".
func keyPressHandler(win *gtk.Window, event *gdk.Event) bool {
	// Convierte el evento genérico a un evento de tecla
	log.Println("¡Tecla presionada!")

	eventKey := gdk.EventKeyNewFromEvent(event)
	if eventKey == nil {
		return false
	}

	// Comprueba si el KeyVal es el de la tecla Escape
	if eventKey.KeyVal() == gdk.KEY_Escape {
		log.Println("¡Tecla ESCAPE presionada!")
		// Aquí puedes poner la lógica que desees (ej: cerrar un diálogo, salir de la app, etc.)

		// Si regresas 'true', indicas que el evento fue manejado y no debe propagarse más.
		return true
	}

	// Regresa 'false' para permitir que el evento se siga propagando a otros manejadores
	return false
}
