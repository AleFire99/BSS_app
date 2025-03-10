import sqlite3
import json
import os

# Path to your database file
db_path = './database/cards.db'

# Path to SQL schema file (make sure the schema file includes the 'core_requirements' table)
sql_file_path = './database/sql/Table_creation/levels.sql'

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

def insert_core_requirements(conn, card_id, core_requirements):
    """Insert the core requirements data into the 'core_requirements' table."""
    try:
        cursor = conn.cursor()
        
        for core in core_requirements:
            insert_sql = """
            INSERT INTO levels (card_id, level, battle_points, cores)
            VALUES (?, ?, ?, ?);
            """
            cursor.execute(insert_sql, (
                card_id,
                core['level'],
                core['battlePoints'],
                core['cores']
            ))
        
        conn.commit()

    except Exception as e:
        print(f"Error inserting core requirements data for card ID {card_id}")
        print(f"Error message: {e}")

def load_and_insert_json_files(conn):
    """Load JSON files from the folder and insert core requirements data into the DB."""
    for root, _, files in os.walk(json_folder_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        card_data = json.load(f)

                        # Get the card ID (should match the 'ID' in the JSON file)
                        card_id = card_data.get('ID')
                        
                        # Insert core requirements data if present
                        if 'core_requirements' in card_data:
                            insert_core_requirements(conn, card_id, card_data['core_requirements'])
                            print(f"Inserted core requirements for card: {card_data['name']}")
                        else:
                            print(f"No core requirements found for card: {card_data['name']}")

                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

def main():
    conn = create_db_from_sql()
    load_and_insert_json_files(conn)
    conn.close()

if __name__ == '__main__':
    main()
