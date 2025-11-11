package main

import (
	"gclip/pkg/db"
	"gclip/pkg/listener"
	"log"
)

var ds *db.Db

func main() {
	setupDb()
	defer ds.Close()
	watcher, err := listener.NewWatcher(func(content []byte) {
		err := ds.Insert(string(content))
		if err != nil {
			log.Printf("Failed to insert clipboard content into DB: %v\n", err)
		}
	})
	if err != nil {
		log.Fatal(err)
	}
	defer watcher.Close()
	watcher.Start()
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
