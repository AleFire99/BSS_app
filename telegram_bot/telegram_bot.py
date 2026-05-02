import sqlite3
import os
import logging
from functools import lru_cache
from telegram import Update
from telegram.ext import Application, InlineQueryHandler, CallbackContext
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database file
DB_FILE = '/app/cards.db'  # Path inside the container

# Create the application
application = Application.builder().token(BOT_TOKEN).build()

# Inline query search logic


@lru_cache(maxsize=128)
def search_cards(query):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    sql_query = """
    SELECT DISTINCT Cards.CardID, Cards.Name, Cards.Image
    FROM Cards
    LEFT JOIN CardColors ON Cards.CardID = CardColors.CardID
    LEFT JOIN Colors ON CardColors.ColorID = Colors.ColorID
    LEFT JOIN CardTypes ON Cards.TypeID = CardTypes.TypeID
    WHERE 1=1
    """
    params = []

    conditions = query.lower().split()
    i = 0

    while i < len(conditions):
        if conditions[i] == "cost":
            try:
                cost_value = int(conditions[i + 1])
                sql_query += " AND Cards.Cost = ?"
                params.append(cost_value)
                i += 2
            except (ValueError, IndexError):
                logger.error("Invalid 'cost' value in query.")
                conn.close()
                return []
        elif conditions[i] == "color":
            try:
                color_name = conditions[i + 1]
                sql_query += " AND LOWER(Colors.Name) = LOWER(?)"
                params.append(color_name)
                i += 2
            except IndexError:
                logger.error("Invalid 'color' value in query.")
                conn.close()
                return []
        elif conditions[i] == "type":
            try:
                type_name = conditions[i + 1]
                sql_query += " AND LOWER(CardTypes.Name) = LOWER(?)"
                params.append(type_name)
                i += 2
            except IndexError:
                logger.error("Invalid 'type' value in query.")
                conn.close()
                return []
        elif conditions[i] == "rarity":
            try:
                rarity_name = conditions[i + 1]
                sql_query += " AND LOWER(Cards.Rarity) = LOWER(?)"
                params.append(rarity_name)
                i += 2
            except IndexError:
                logger.error("Invalid 'rarity' value in query.")
                conn.close()
                return []
        else:
            name_query = " ".join(conditions[i:])
            sql_query += " AND LOWER(Cards.Name) LIKE LOWER(?)"
            params.append(f"%{name_query}%")
            break

    cursor.execute(sql_query, params)
    results = cursor.fetchall()
    conn.close()

    return results

# Define the function to handle inline queries


async def handle_inline_query(update: Update, context: CallbackContext):
    query = update.inline_query.query.strip()
    if not query:
        return

    results = search_cards(query)

    inline_results = []
    for card_id, name, path in results:
        photo_url = f"https://www.bssdb.dev/cards/bss/{card_id}.png"
        inline_results.append({
            'type': 'photo',
            'id': card_id,
            'photo_url': photo_url,
            'thumb_url': photo_url,
        })

    inline_results = inline_results[:50]

    try:
        await update.inline_query.answer(inline_results)
    except Exception as e:
        logger.error(f"Error while answering inline query: {e}")

# Add the inline query handler to the bot
application.add_handler(InlineQueryHandler(handle_inline_query))

# Start the application for polling
application.run_polling()
