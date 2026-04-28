import sqlite3
import json

def save_result(result_data: dict, db_path="nasomeatr.db"):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mrn TEXT,
            avg_nasalance_score REAL,
            nasal_audio_file TEXT,
            oral_audio_file TEXT,
            nasalance_data TEXT,   -- stored as JSON string
            waveform_data TEXT,    -- stored as JSON string
            pressure_data TEXT,    -- stored as JSON string
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        INSERT INTO recordings 
        (mrn, avg_nasalance_score, nasal_audio_file, oral_audio_file,
         nasalance_data, waveform_data, pressure_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        result_data["mrn"],
        result_data["avg_nasalance_score"],
        result_data["nasal_audio_file"],
        result_data["oral_audio_file"],
        json.dumps(result_data["nasalance_data"]),
        json.dumps(result_data["waveform_data"]),
        json.dumps(result_data["pressure_data"]),
    ))
    
    conn.commit()
    conn.close()
