import sqlite3
import telepot
from telepot.loop import MessageLoop
import time
import logging
from functools import lru_cache

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Telegram bot token
BOT_TOKEN = "8024197858:AAEmeR0DQdriA2kzgJEdaq9d9UrdCfLWbXQ"  # Replace with your bot's token

# Database file
DB_FILE = '/app/cards.db'  # Path inside the container
#DB_FILE = "C:/Users/AleFire/Desktop/Projects/BSS_app/telegram_bot/cards.db"

# Initialize the bot
bot = telepot.Bot(BOT_TOKEN)

# Cache for database results to reduce repeated queries
@lru_cache(maxsize=128)
def search_cards(query):
    # Connect to the database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    if query.lower().startswith("cost "):
        try:
            # Extract the number after "cost"
            cost_value = int(query.split(" ", 1)[1].split(" ", 1)[0])
            remaining_query = query[len(f"cost {cost_value}"):].strip()  # Get the rest for name query

            # Query by cost
            cursor.execute("SELECT CardID, Name, Image FROM Cards WHERE Cost = ?", (cost_value,))
            results = cursor.fetchall()

            # If there is a part for the name, filter results by name
            if remaining_query:
                results = [card for card in results if remaining_query.lower() in card[1].lower()]
            
        except ValueError:
            # If the value after "cost" is not a valid integer, return an empty result
            conn.close()
            return []
    else:
        # Regular name query (case insensitive)
        cursor.execute("SELECT CardID, Name, Image FROM Cards WHERE LOWER(Name) LIKE LOWER(?)", (f"%{query}%",))
        results = cursor.fetchall()

    conn.close()
    return results

# Define the function to handle inline queries
def handle_inline_query(msg):
    query = msg.get('query', '').strip()
    if not query:
        return

    # Use cached search results if available
    results = search_cards(query)

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

    # Limit results to 50 as per Telegram's API limitations
    inline_results = inline_results[:50]

    try:
        # Send results back to the user
        bot.answerInlineQuery(msg['id'], inline_results)
    except telepot.exception.TelegramError as e:
        # Handle specific Telegram errors
        if 'query is too old' in str(e):
            logger.info("Query is too old, ignoring the response.")
        else:
            logger.error(f"Error while answering inline query: {e}")

# Set up the message loop for inline queries
MessageLoop(bot, {'inline_query': handle_inline_query}).run_as_thread()

logger.info("Bot is running...")

# Keep the program running with less CPU usage
try:
    while True:
        time.sleep(10)  # Sleep to reduce CPU usage
except KeyboardInterrupt:
    logger.info("Bot stopped by user")
