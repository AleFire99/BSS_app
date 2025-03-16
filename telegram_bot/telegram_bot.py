import sqlite3
import telepot
from telepot.loop import MessageLoop
import os

# Telegram bot token
BOT_TOKEN = "8024197858:AAEmeR0DQdriA2kzgJEdaq9d9UrdCfLWbXQ"  # Replace with your bot's token

# Database file
DB_FILE = "C:/Users/AleFire/Desktop/Projects/BSS_app/telegram_bot/cards.db"

# Path to the folder where images are stored
IMAGE_FOLDER = "C:/Users/AleFire/Desktop/Projects/BSS_app/"  # Change this to your actual image folder path

# Define the function to handle inline queries
def handle_inline_query(msg):
    query = msg.get('query', '').strip()
    if not query:
        return

    # Connect to the database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Query the database for cards matching the search term
    cursor.execute("SELECT CardID, Name, Image FROM Cards WHERE Name LIKE ?", (f"%{query}%",))
    results = cursor.fetchall()
    conn.close()

    # Prepare inline query results (images hosted on your server or ngrok)
    inline_results = []
    for card_id, name, path in results:

        # Generate the URL for the full image
        photo_url = f"https://www.bssdb.dev/cards/bss/{card_id}.png"

        # Prepare the inline query result with the full image
        inline_results.append({
            'type': 'photo',
            'id': card_id,
            'photo_url': photo_url,  # Full-size image URL
            'thumb_url': photo_url,  # Thumbnail URL (same as full-size image)
        })

        print(f"Card ID: {card_id}")

    inline_results = inline_results[:50]

    try:
        # Send results back to the user
        bot.answerInlineQuery(msg['id'], inline_results)
    except telepot.exception.TelegramError as e:
        # Handle specific Telegram errors
        if 'query is too old' in str(e):
            print("Query is too old, ignoring the response.")
        else:
            print(f"Error while answering inline query: {e}")

# Initialize the bot
bot = telepot.Bot(BOT_TOKEN)

# Set up the message loop for inline queries
MessageLoop(bot, {'inline_query': handle_inline_query}).run_as_thread()

print("Bot is running...")

# Keep the program running (blocking)
while True:
    pass
