import sqlite3
import json
import os

# Path to your database file
db_path = './database/db/cards.db'

# Path to SQL schema file
sql_file_path = './database/sql/keywords.sql'

# Path to the keywords JSON file
keywords_json_path = './json/keywords.json'

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

def insert_keywords(conn, keywords):
    """Insert the keywords data into the 'keywords' table."""
    try:
        cursor = conn.cursor()
        
        for keyword in keywords:
            insert_sql = """
            INSERT INTO keywords (name, description)
            VALUES (?, ?);
            """
            cursor.execute(insert_sql, (
                keyword['name'],
                keyword['description']
            ))
        
        conn.commit()

    except Exception as e:
        print("Error inserting keywords data")
        print(f"Error message: {e}")

def load_keywords_json(conn):
    """Load the keywords JSON file and insert its data into the DB."""
    try:
        with open(keywords_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            keywords = data.get('keywords', [])
            insert_keywords(conn, keywords)
            print(f"Inserted {len(keywords)} keywords into the database.")

    except Exception as e:
        print(f"Error processing keywords JSON file: {e}")

def main():
    conn = create_db_from_sql()
    load_keywords_json(conn)
    conn.close()

if __name__ == '__main__':
    main()
