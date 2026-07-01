import sqlite3
import os
from passlib.context import CryptContext
from pathlib import Path

# Setup bcrypt context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "trustguard.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    # Ensure directory exists
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL,
            display_name TEXT,
            status TEXT DEFAULT 'approved'
        )
    """)
    
    # Check if table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("Initializing database with seed accounts...")
        
        # Seed owner account
        owner_pass = "owner"
        owner_hash = pwd_context.hash(owner_pass)
        cursor.execute(
            "INSERT INTO users (username, hashed_password, role, display_name, status) VALUES (?, ?, ?, ?, ?)",
            ("owner", owner_hash, "owner", "TrustGuard Owner", "approved")
        )
        print(f"Seeded owner account: username=owner password={owner_pass}")
        
        # Seed admin account
        admin_pass = "admin"
        admin_hash = pwd_context.hash(admin_pass)
        cursor.execute(
            "INSERT INTO users (username, hashed_password, role, display_name, status) VALUES (?, ?, ?, ?, ?)",
            ("admin", admin_hash, "admin", "Admin User", "approved")
        )
        print(f"Seeded admin account: username=admin password={admin_pass}")
        
        # Seed analyst account
        analyst_pass = "analyst"
        analyst_hash = pwd_context.hash(analyst_pass)
        cursor.execute(
            "INSERT INTO users (username, hashed_password, role, display_name, status) VALUES (?, ?, ?, ?, ?)",
            ("analyst", analyst_hash, "analyst", "Analyst User", "approved")
        )
        print(f"Seeded analyst account: username=analyst password={analyst_pass}")
        
        conn.commit()
    
    conn.close()

# Ensure DB is initialized when module is loaded
init_db()
