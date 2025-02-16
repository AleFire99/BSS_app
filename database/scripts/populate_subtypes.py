import sqlite3
import json
import os

# Path to your database file
db_path = './database/db/cards.db'

# Path to SQL schema file
sql_file_path = './database/sql/subtypes.sql'

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

def insert_subtypes(conn, card_id, subtypes):
    """Insert the subtype data into the 'subtypes' table."""
    try:
        cursor = conn.cursor()
        
        for subtype in subtypes:
            insert_sql = """
            INSERT INTO subtypes (card_id, subtype)
            VALUES (?, ?);
            """
            cursor.execute(insert_sql, (card_id, subtype))
        
        conn.commit()

    except Exception as e:
        print(f"Error inserting subtype data for card ID {card_id}")
        print(f"Error message: {e}")

def load_and_insert_json_files(conn):
    """Load JSON files from the folder and insert subtype data into the DB."""
    for root, _, files in os.walk(json_folder_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        card_data = json.load(f)

                        # Get the card ID (should match the 'ID' in the JSON file)
                        card_id = card_data.get('ID')
                        
                        # Insert subtype data if present
                        if 'subType' in card_data:
                            insert_subtypes(conn, card_id, card_data['subType'])
                            print(f"Inserted subtypes for card: {card_data['name']}")
                        else:
                            print(f"No subtypes found for card: {card_data['name']}")

                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

def main():
    conn = create_db_from_sql()
    load_and_insert_json_files(conn)
    conn.close()

if __name__ == '__main__':
    main()
