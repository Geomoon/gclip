package db

import (
	"database/sql"
	"gclip/pkg/data"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

type Db struct {
	conn *sql.DB
}

func NewDb() *Db {
	return &Db{}
}

func (db *Db) Connect() error {
	conn, err := sql.Open("sqlite3", "file:gclip.db?cache=shared&mode=rwc")
	if err != nil {
		log.Panicln("error at open sqlite db:", err)
		return err
	}
	db.conn = conn
	return nil
}

func (db *Db) Close() {
	if db.conn != nil {
		db.conn.Close()
	}
}

func (db *Db) GetConnection() *sql.DB {
	return db.conn
}

func (db *Db) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS clipboard_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		content TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.conn.Exec(schema)
	if err != nil {
		log.Panicln("error at init db schema:", err)
		return err
	}
	return nil
}

func (db *Db) Insert(content string) error {
	query := `INSERT INTO clipboard_history (content) VALUES (?)`
	_, err := db.conn.Exec(query, content)
	if err != nil {
		log.Panicln("error at insert clipboard content:", err)
		return err
	}
	return nil
}

func (db *Db) Select(limit int) ([]data.Item, error) {
	query := `SELECT id, content FROM clipboard_history ORDER BY timestamp DESC LIMIT ?`
	rows, err := db.conn.Query(query, limit)
	if err != nil {
		log.Panicln("error at get clipboard history:", err)
		return nil, err
	}
	defer rows.Close()

	var history []data.Item
	for rows.Next() {
		var item data.Item
		if err := rows.Scan(&item.ID, &item.Content); err != nil {
			log.Panicln("error at scan clipboard history row:", err)
			return nil, err
		}
		history = append(history, item)
	}
	return history, nil
}
