import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("app.db");

export const initDb = () => {
  db.transaction(tx => {
    tx.executeSql(`PRAGMA foreign_keys = ON;`);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS patient (
        mrn INTEGER PRIMARY KEY,
        full_name TEXT,
        dob TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        gender TEXT,
        picture_url TEXT,
        notes TEXT,
        first_language TEXT,
        second_language TEXT,
        ethnicity TEXT,
        race TEXT,
        country TEXT
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS patient_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        avg_nasalance_score REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        nasal_audio TEXT,
        oral_audio TEXT,
        nasalance_data TEXT,
        mrn INTEGER,
        FOREIGN KEY (mrn) REFERENCES patient(mrn)
      );
    `);
  });
};

export default db;