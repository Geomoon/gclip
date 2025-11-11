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

	db.Insert("text 00")
	db.Insert("text 01")
	db.Insert("text 02")
	db.Insert("text 03")
	db.Insert("text 04")
	db.Insert("text 05")
	db.Insert("text 06")
	db.Insert("text 07")
	db.Insert("text 08")
	db.Insert("text 09")
	db.Insert("text 10")
	db.Insert("text 11")
	db.Insert("text 12")
	db.Insert("text 13")
	db.Insert("text 14")
	db.Insert("text 15")
	db.Insert("text 16")
	db.Insert("text 17")
	db.Insert("text 18")
	db.Insert("text 19")
	db.Insert("text 20")
	db.Insert("text 21")
	db.Insert("text 22")
	db.Insert("text 23")
	db.Insert("text 24")
	db.Insert("text 25")
	db.Insert("text 26")
	db.Insert("text 27")
	db.Insert("text 28")
	db.Insert("text 29")

	data, _ := db.Select(20)

	log.Println(data)
}
