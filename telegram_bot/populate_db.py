import os
import json
import sqlite3

# Database file
DB_FILE = "cards.db"

# Directory containing JSON files
JSON_DIR = "json/Sets"

# Connect to the SQLite database
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Ensure the Cards table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS Cards (
    CardID TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Type TEXT,
    Cost INTEGER,
    Image TEXT
);
""")

# Function to parse JSON files and insert data
def populate_database():
    for set_folder in os.listdir(JSON_DIR):
        set_path = os.path.join(JSON_DIR, set_folder)
        if os.path.isdir(set_path):
            for json_file in os.listdir(set_path):
                if json_file.endswith(".json"):
                    file_path = os.path.join(set_path, json_file)
                    with open(file_path, "r", encoding="utf-8") as file:
                        data = json.load(file)
                        # Extract relevant fields
                        card_id = data["ID"]
                        name = data["name"]
                        card_type = data.get("cardType", "Unknown")
                        cost = int(data.get("cost", 0))
                        image = data["image"]

                        # Insert into database
                        cursor.execute("""
                        INSERT OR IGNORE INTO Cards (CardID, Name, Type, Cost, Image)
                        VALUES (?, ?, ?, ?, ?)
                        """, (card_id, name, card_type, cost, image))

# Populate the database
populate_database()

# Commit changes and close the connection
conn.commit()
conn.close()

print("Database populated successfully!")
