package main

import (
	"gclip/pkg/db"
	"log"
)

func main() {
	db := db.NewDb()
	err := db.Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	err = db.InitSchema()
	if err != nil {
		panic(err)
	}

	db.Insert("text 34")

	data, _ := db.Select(10)

	log.Println(data)
}
