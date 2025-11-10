package main

import "gclip/pkg/ui"

func main() {
	// Initialize GTK without parsing any command line arguments.
	ui := ui.NewUI()
	ui.Run()
}
