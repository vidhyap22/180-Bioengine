import * as SQLite from "expo-sqlite";

let db;

export const initDb = async () => {
  db = await SQLite.openDatabaseAsync("app.db");

  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
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

  await db.execAsync(`
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
};

export const getDb = () => db;

export default db;
