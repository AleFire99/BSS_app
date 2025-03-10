import sqlite3
import json
import os

# Path to your database file
db_path = './database/cards.db'

# Path to SQL schema file
sql_file_path = './database/sql/Table_creation/effects.sql'

# Path to the root folder containing JSON files and subfolders
json_folder_path = './json'

def create_db_from_sql():
    """Create the database from the SQL schema in the provided SQL file."""
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Execute the schema to create tables
    cursor.executescript(schema_sql)
    conn.commit()

    return conn

def insert_effects(conn, card_id, effects):
    """Insert the effects data into the 'effects' table."""
    try:
        cursor = conn.cursor()
        
        for effect in effects:
            insert_sql = """
            INSERT INTO effects (card_id, condition, details)
            VALUES (?, ?, ?);
            """
            cursor.execute(insert_sql, (
                card_id,
                effect.get('condition', None),  # Default to 'N/A' if condition is missing
                effect.get('details', None)     # Default to 'N/A' if details are missing
            ))
        
        conn.commit()

    except Exception as e:
        print(f"Error inserting effects data for card ID {card_id}")
        print(f"Error message: {e}")

def load_and_insert_json_files(conn):
    """Load JSON files from the folder and insert effects data into the DB."""
    for root, _, files in os.walk(json_folder_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        card_data = json.load(f)

                        # Get the card ID (should match the 'ID' in the JSON file)
                        card_id = card_data.get('ID')
                        
                        # Insert effects data if present
                        if 'effects' in card_data:
                            insert_effects(conn, card_id, card_data['effects'])
                            print(f"Inserted effects for card: {card_data['name']}")
                        else:
                            print(f"No effects found for card: {card_data['name']}")

                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

def main():
    conn = create_db_from_sql()
    load_and_insert_json_files(conn)
    conn.close()

if __name__ == '__main__':
    main()
