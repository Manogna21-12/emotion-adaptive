import sqlite3
import os

def migrate():
    path = "backend/reports.db"
    if not os.path.exists(path):
        print("Database not found.")
        return
    
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute("PRAGMA table_info(reports);")
    cols = [c[1] for c in cursor.fetchall()]
    
    try:
        if "total_time_spent" in cols and "total_time" not in cols:
            print("Renaming total_time_spent to total_time...")
            cursor.execute("ALTER TABLE reports RENAME COLUMN total_time_spent TO total_time;")
        
        if "total_sessions" in cols and "sessions" not in cols:
            print("Renaming total_sessions to sessions...")
            cursor.execute("ALTER TABLE reports RENAME COLUMN total_sessions TO sessions;")
        
        conn.commit()
        print("Migration SUCCESS!")
    except Exception as e:
        print(f"Migration failed (maybe SQLite version too old): {e}")
        print("Attempting DROP and RECREATE instead...")
        # Since the database is reported as blank anyway, we can just start fresh
        try:
            cursor.close()
            conn.close()
            os.remove(path)
            print(f"Deleted {path}. Backend will recreate it with correct schema on startup.")
        except Exception as e2:
            print(f"Finally failed to delete: {e2}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
