package main

import (
	"gclip/pkg/listen"
	"log"
)

func main() {
	// Crear el monitor del portapapeles con un callback
	monitor := listen.NewClipboardMonitor(func(text string) {
		log.Printf("Nuevo contenido copiado: %s\n", text)
		// Aquí puedes agregar lógica para guardar en una base de datos,
		// agregar a un historial, etc.
	})

	// Iniciar el monitoreo
	log.Println("Iniciando monitor del portapapeles...")
	monitor.Start()
}
