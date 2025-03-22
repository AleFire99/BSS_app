import sqlite3
import logging
from functools import lru_cache
from telegram import Update
from telegram.ext import Application, CommandHandler, CallbackContext, InlineQueryHandler

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Telegram bot token
BOT_TOKEN = "REDACTED_BOT_TOKEN"  # Replace with your bot's token

# Database file
#DB_FILE = "C:/Users/AleFire/Desktop/Projects/BSS_app/telegram_bot/cards.db"
DB_FILE = '/app/cards.db'  # Path inside the container

# Create the application
application = Application.builder().token(BOT_TOKEN).build()

# Define the /start command handler
async def start_command(update: Update, context: CallbackContext):
    video_file_id = "BAACAgQAAxkBAAEy6-Jn3rbtRB3WrkbTaBLA1eO6FuN9JAAC7BkAAplM-VJ4xBBDJPhJUjYE"  # Replace with your actual video file ID
    await update.message.reply_video(video=video_file_id, caption="Here's a quick guide on how to use the bot!")

# Add the /help command to the bot
application.add_handler(CommandHandler("start", start_command))

# Inline query search logic
@lru_cache(maxsize=128)
def search_cards(query):
    # Connect to the database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Initialize the base SQL query and parameters
    sql_query = """
    SELECT DISTINCT Cards.CardID, Cards.Name, Cards.Image 
    FROM Cards
    LEFT JOIN CardColors ON Cards.CardID = CardColors.CardID
    LEFT JOIN Colors ON CardColors.ColorID = Colors.ColorID
    WHERE 1=1
    """
    params = []

    # Split the query into conditions
    conditions = query.lower().split()
    i = 0

    # Parse each condition
    while i < len(conditions):
        if conditions[i] == "cost":
            try:
                # Parse the cost value
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
                # Parse the color name
                color_name = conditions[i + 1]
                sql_query += " AND LOWER(Colors.ColorName) = LOWER(?)"
                params.append(color_name)
                i += 2
            except IndexError:
                logger.error("Invalid 'color' value in query.")
                conn.close()
                return []
        elif conditions[i] == "type":
            try:
                # Parse the type name
                type_name = conditions[i + 1]
                sql_query += " AND LOWER(Cards.Type) = LOWER(?)"
                params.append(type_name)
                i += 2
            except IndexError:
                logger.error("Invalid 'type' value in query.")
                conn.close()
                return []
        else:
            # Assume the remaining part is a general name query
            name_query = " ".join(conditions[i:])
            sql_query += " AND LOWER(Cards.Name) LIKE LOWER(?)"
            params.append(f"%{name_query}%")
            break

    # Execute the dynamically constructed query
    cursor.execute(sql_query, params)
    results = cursor.fetchall()
    conn.close()

    return results

# Define the function to handle inline queries
async def handle_inline_query(update: Update, context: CallbackContext):
    query = update.inline_query.query.strip()
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
        await update.inline_query.answer(inline_results)
    except Exception as e:
        logger.error(f"Error while answering inline query: {e}")

# Add the inline query handler to the bot
application.add_handler(InlineQueryHandler(handle_inline_query))

# Start the application for polling
application.run_polling()

