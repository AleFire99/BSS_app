import sqlite3
import json
import os

# Path to your database file
db_path = './database/db/cards.db'

# Path to SQL schema file
sql_file_path = './database/sql/cards.sql'

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

def insert_card_data(conn, card_data):
    """Insert the card data into the 'cards' table."""
    try:
        # Extract the required fields from card_data
        name = card_data.get('name')
        card_id = card_data.get('ID')
        cost = card_data.get('cost')
        card_type = card_data.get('cardType')
        rarity = card_data.get('rarity')

        # Ensure all required fields are available
        if not all([name, card_id, cost, card_type, rarity]):
            print(f"Skipping card due to missing required fields: {card_data}")
            return

        insert_sql = """
        INSERT INTO cards (name, card_id, set_name, image, cost, reduction, symbols, type, rarity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        
        cursor = conn.cursor()
        cursor.execute(insert_sql, (
            name,
            card_id,
            card_data.get('set', ''),
            card_data.get('image', ''),
            int(cost),  # Ensure cost is an integer
            ','.join(card_data.get('reduction', [])),  # Convert list to comma-separated string
            ','.join(card_data.get('symbols', [])),    # Convert list to comma-separated string
            card_type,
            rarity
        ))
        conn.commit()

    except Exception as e:
        print(f"Error inserting card data: {card_data}")
        print(f"Error message: {e}")

def load_and_insert_json_files(conn):
    """Load JSON files from the folder and insert card data into the DB."""
    for root, _, files in os.walk(json_folder_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        card_data = json.load(f)
                        insert_card_data(conn, card_data)
                        print(f"Inserted card: {card_data['name']}")
                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

def main():
    conn = create_db_from_sql()
    load_and_insert_json_files(conn)
    conn.close()

if __name__ == '__main__':
    main()