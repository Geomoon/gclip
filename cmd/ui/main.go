package main

import (
	"gclip/pkg/db"
	"gclip/pkg/ui"
)

var ds *db.Db

func main() {
	setupDb()
	defer ds.Close()
	// Initialize GTK without parsing any command line arguments.
	ui := ui.NewUI(ds)
	ui.Run()
}

func setupDb() {
	ds = db.NewDb()
	err := ds.Connect()
	if err != nil {
		panic(err)
	}
	err = ds.InitSchema()
	if err != nil {
		panic(err)
	}
}
