import os
import json
import sqlite3

# Database file
DB_FILE = "new_cards.db"

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
    Image TEXT,
    Rarity TEXT
);
""")

# Ensure the Colors table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS Colors (
    ColorID INTEGER PRIMARY KEY AUTOINCREMENT,
    ColorName TEXT NOT NULL UNIQUE
);
""")

# Ensure the CardColors table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS CardColors (
    CardID TEXT NOT NULL,
    ColorID INTEGER NOT NULL,
    FOREIGN KEY (CardID) REFERENCES Cards(CardID),
    FOREIGN KEY (ColorID) REFERENCES Colors(ColorID),
    PRIMARY KEY (CardID, ColorID)
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

                        # Extract card details
                        card_id = data["ID"]
                        name = data["name"]
                        card_type = data.get("cardType", "Unknown")
                        cost = int(data.get("cost", 0))
                        image = data["image"]
                        rarity = data.get("rarity", None)

                        # Insert card into the Cards table
                        cursor.execute("""
                        INSERT OR IGNORE INTO Cards (CardID, Name, Type, Cost, Image, Rarity)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """, (card_id, name, card_type, cost, image, rarity))

                        # Insert colors and link them to the card
                        colors = data.get("color", [])
                        for color in colors:
                            # Insert color into the Colors table
                            cursor.execute("""
                            INSERT OR IGNORE INTO Colors (ColorName)
                            VALUES (?)
                            """, (color,))

                            # Get the ColorID for the inserted/selected color
                            cursor.execute("""
                            SELECT ColorID FROM Colors WHERE ColorName = ?
                            """, (color,))
                            color_id = cursor.fetchone()[0]

                            # Link the card to the color in the CardColors table
                            cursor.execute("""
                            INSERT OR IGNORE INTO CardColors (CardID, ColorID)
                            VALUES (?, ?)
                            """, (card_id, color_id))


# Populate the database
populate_database()

# Commit changes and close the connection
conn.commit()
conn.close()

print("Database populated successfully!")
