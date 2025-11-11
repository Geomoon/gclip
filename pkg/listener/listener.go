package listener

import (
	"bytes"
	"log"
	"time"

	"github.com/BurntSushi/xgb"
	"github.com/BurntSushi/xgb/xproto"
)

type ClipboardWatcher struct {
	conn          *xgb.Conn
	window        xproto.Window
	clipboardAtom xproto.Atom
	onChange      func(content []byte)
	lastContent   []byte
}

func NewWatcher(onChange func([]byte)) (*ClipboardWatcher, error) {
	// Conectar a X11
	conn, err := xgb.NewConn()
	if err != nil {
		return nil, err
	}

	// Obtener el atom CLIPBOARD
	clipboardAtom, err := xproto.InternAtom(conn, false, 9, "CLIPBOARD").Reply()
	if err != nil {
		return nil, err
	}
	setup := xproto.Setup(conn)
	screen := setup.DefaultScreen(conn)
	window, err := xproto.NewWindowId(conn)
	if err != nil {
		return nil, err
	}

	err = xproto.CreateWindowChecked(
		conn,
		screen.RootDepth,
		window,
		screen.Root,
		0, 0, 1, 1, 0,
		xproto.WindowClassInputOutput,
		screen.RootVisual,
		xproto.CwEventMask,
		[]uint32{xproto.EventMaskPropertyChange},
	).Check()
	if err != nil {
		return nil, err
	}
	return &ClipboardWatcher{
		conn:          conn,
		window:        window,
		clipboardAtom: clipboardAtom.Atom,
		onChange:      onChange,
		lastContent:   nil,
	}, nil
}

func (w *ClipboardWatcher) Start() {
	log.Println("Clipboard watcher started (polling mode)")
	for {
		// Leer contenido actual del clipboard
		content := w.readClipboard()
		// Comparar con el contenido previo
		if content != nil && !bytes.Equal(content, w.lastContent) {
			w.lastContent = content
			w.onChange(content)
		}
		// Polling cada 500ms
		time.Sleep(500 * time.Millisecond)
	}
}

func (w *ClipboardWatcher) readClipboard() []byte {
	// Obtener el átomo UTF8_STRING para mejor soporte de texto
	utf8Atom, err := xproto.InternAtom(w.conn, false, 11, "UTF8_STRING").Reply()
	if err != nil {
		return nil
	}
	// Solicitar conversión de la selección
	xproto.ConvertSelection(
		w.conn,
		w.window,
		w.clipboardAtom,
		utf8Atom.Atom,
		w.clipboardAtom,
		xproto.TimeCurrentTime,
	)
	w.conn.Sync()
	// Esperar el evento SelectionNotify con timeout
	timeout := time.After(100 * time.Millisecond)
	for {
		select {
		case <-timeout:
			return nil
		default:
			event, err := w.conn.PollForEvent()
			if err != nil {
				return nil
			}
			if event != nil {
				if sn, ok := event.(xproto.SelectionNotifyEvent); ok {
					if sn.Property == w.clipboardAtom {
						// Leer la propiedad de la ventana
						prop, err := xproto.GetProperty(
							w.conn, true, w.window,
							w.clipboardAtom, xproto.GetPropertyTypeAny,
							0, 1024*1024,
						).Reply()
						if err != nil {
							return nil
						}
						return prop.Value
					}
				}
			}
			time.Sleep(10 * time.Millisecond)
		}
	}
}

func (w *ClipboardWatcher) Close() {
	w.conn.Close()
}
