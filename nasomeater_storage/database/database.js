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

// Helper to get all patients
export const getAllPatients = async () => {
    if (!db) return [];
    return await db.getAllAsync("SELECT * FROM patient ORDER BY created_at DESC");
};

// Helper to get a single patient with their test count and last test date
export const getPatientsWithStats = async () => {
    if (!db) return [];
    return await db.getAllAsync(`
        SELECT p.*, 
        (SELECT COUNT(*) FROM patient_data pd WHERE pd.mrn = p.mrn) as testsCount,
        (SELECT MAX(created_at) FROM patient_data pd WHERE pd.mrn = p.mrn) as lastTestDate
        FROM patient p 
        ORDER BY created_at DESC
    `);
};

// Helper to get patient total stats for dashboard
export const getDashboardStats = async () => {
    if (!db) return { patientCount: 0, avgNasalance: 0, testCount: 0 };
    const patientCount = await db.getFirstAsync("SELECT COUNT(*) as count FROM patient");
    const testCount = await db.getFirstAsync("SELECT COUNT(*) as count FROM patient_data");
    const avgNasalance = await db.getFirstAsync("SELECT AVG(avg_nasalance_score) as avg FROM patient_data");
    
    return {
        patientCount: patientCount?.count || 0,
        testCount: testCount?.count || 0,
        avgNasalance: Math.round(avgNasalance?.avg || 0)
    };
};

// Helper to get patient details and their tests
export const getPatientTests = async (mrn) => {
    if (!db) return [];
    return await db.getAllAsync(
        "SELECT * FROM patient_data WHERE mrn = ? ORDER BY created_at DESC",
        [mrn]
    );
};

export default db;
