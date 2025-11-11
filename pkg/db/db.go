package db

import (
	"database/sql"
	"fmt"
	"gclip/pkg/data"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

type Db struct {
	conn *sql.DB
}

func NewDb() *Db {
	return &Db{}
}

func (db *Db) Connect() error {
	dbPath, err := getDBPath()
	if err != nil {
		log.Panicln("error getting db path:", err)
		return err
	}
	conn, err := sql.Open("sqlite3", fmt.Sprintf("file:%s?cache=shared&mode=rwc", dbPath))
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

func (db Db) InitSchema() error {
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

func (db Db) Insert(content string) error {
	query := `INSERT INTO clipboard_history (content) VALUES (?)`
	_, err := db.conn.Exec(query, content)
	if err != nil {
		log.Panicln("error at insert clipboard content:", err)
		return err
	}
	log.Println("Inserted clipboard content:", content)
	db.resizeDb()
	return nil
}

func (db Db) Select(limit int) ([]data.Item, error) {
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
	log.Println("Queried clipboard history", history)
	return history, nil
}

// resizeDb is a function that can be used to delete old records because they are no longer needed.
// For example, we can keep only the last N records.
func (db Db) resizeDb() error {
	query := `DELETE FROM clipboard_history WHERE id NOT IN (SELECT id FROM clipboard_history ORDER BY timestamp DESC LIMIT 20)`
	_, err := db.conn.Exec(query)
	if err != nil {
		log.Panicln("error at resize db:", err)
		return err
	}
	log.Println("resized table")
	return nil
}

// Define el nombre de tu aplicación (usa minúsculas)
const appName = "gclip"

func getDBPath() (string, error) {
	// 1. Prioriza $XDG_DATA_HOME
	dataHome := os.Getenv("XDG_DATA_HOME")
	if dataHome == "" {
		// 2. Fallback a ~/.local/share
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		dataHome = filepath.Join(homeDir, ".local", "share")
	}

	// 3. Crear el directorio específico de la aplicación
	appDir := filepath.Join(dataHome, appName)
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}

	// 4. Devolver la ruta completa del archivo DB
	dbPath := filepath.Join(appDir, appName+".db")
	return dbPath, nil
}
