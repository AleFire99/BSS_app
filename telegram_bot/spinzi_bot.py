from typing import Final
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler, CallbackContext
import io
import os 
import random
import re 
import numpy as np
import asyncio
import pickle
import hashlib
from PIL import Image

TOKEN: Final = "7988429551:AAEZ0vqhgMx5GQPW2H6x2XE3KuN4Aiy-Mhk"
BOT_USERNAME: Final = "@DrivePictures_bot"

# Commands
# async permette di eseguire altre istruzioni nel mentre che questa funzione viene eseguita
#   e.g. una funzione asincrona che mette un hold di 10s permette allo user di usare altre funzioni durante questo tempo
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Benvenuto su DriveBot, qui trovi immagini di tutti i gusti ;), basta usare il comando /pic. \n"
                                    + "Con /pref puoi settare le preferenze e con /waifu poi proporre un personaggio che vorresti vedere in futuro.\n"
                                    + "Usa il comando /help per avere più dettagli sui comandi.")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Ciao, qui sotto trovi informazioni sui comandi disponibili: \n"
                                    + "/pic #N dove #N è un numero da 1 a 10!\n"
                                    + "/pref modifica la tua preferenza sulle immagini da mandare. Puoi cambiarla quando vuoi.\n"
                                    + "/waifu scrivi il comando e associa il nome del personaggio che vorresti, nello stesso messaggio. Tipo: '/waifu Camelia'. Il nome verrà salvato e forse in futuro vedrai qualcosa!")   

async def send_photo(update: Update, context: ContextTypes.DEFAULT_TYPE): 
    text: str = update.message.text # Testo immesso dall'user

    # Ottieni l'oggetto utente
    user = update.message.from_user
    
    # Recupera lo username
    username = user.username if user.username else "Username non trovato"
    
    if username == "Username non trovato":
        await update.message.reply_text("Per usare il bot devi impostare uno username")
        return

    # Correggo la stringa per una sola foto nel caso in cui il numero non venga specificato
    if text.lower() == "/pic":
        num_photos = 1
    else:
        # Manipolo il testo per estrarre un numero
        match = re.search(r'\d+', text)  # Cerca una sequenza di cifre
        num_photos = int(match.group())  # Converte la corrispondenza in intero
    
    # Numero massimo di foto alla volta
    if num_photos > 100:
        num_photos = 100
        await update.message.reply_text("Sei proprio un porcellino! C'è un limite sai?")
    
    crypted = hashlib.sha256(username.encode()).hexdigest()

    pref_file_name = "Preferences.pkl"
    folder_path = "."
    
    # Ottengo preferenza dell'utente dal file "Preferences.pkl"
    file_path_preferences = os.path.join(folder_path, pref_file_name)
    if os.path.exists(file_path_preferences):
        # se esiste, ottengo la preferenza dell'utente o la setto io se l'utente è nuovo
        with open(pref_file_name, 'rb') as file:
            pref_list = pickle.load(file)
        if crypted in pref_list:
            pref_folder = pref_list[crypted]
        else:
            await update.message.reply_text("Ciao, visto che è la prima volta che ti vedo, ho settato la tua preferenza su contenuti meno spicy, se cambi idea digita /pref")
            pref_list[crypted] = "E_folder"
            with open(pref_file_name, 'wb') as file:
                pickle.dump(pref_list, file)
            pref_folder = pref_list[crypted]
    else:
        # Creo il dizionario
        pref_list = {str(crypted): "E_folder"}
        # Salvataggio del dizionario nel file .pkl
        with open(pref_file_name, "wb") as file:
            pickle.dump(pref_list, file) 
        pref_folder = "E_folder"
# Directory della cartella
    match pref_folder:
        case "E_folder":
            photo_folder = r'C:\Users\Samsung\Desktop\Reti\98_PixivE'
        case "H_folder": 
            photo_folder = r'C:\Users\Samsung\Desktop\Reti\99_PixivH'


    # Lista di file nella cartella
    photos = [f for f in os.listdir(photo_folder) if f.endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    
    if not photos:
        await update.message.reply_text("Non ci sono foto disponibili nella cartella.")
        return

    # Creo file per ricordare foto mandate all'utente
    match pref_folder:
        case "E_folder":
            file_name = crypted+"E.pkl"
        case "H_folder":
            file_name = crypted+"H.pkl"

    folder_path_usr = "usr/" 

    file_path = os.path.join(folder_path_usr, file_name)
    if os.path.exists(file_path):
        # se esiste, apro il file con le foto già mandate 
        with open(file_path, 'rb') as file:
            arr_photo = pickle.load(file)
        giavisto = len(arr_photo) 
        # print(giavisto)
    else:
        # Creo array per ricordarmi le foto 
        arr_photo = []
        giavisto = 0

    # se l'utente chiede più foto di quante ce ne siano di ancora non mandate, allora riceve una warning
    if len(photos) - (num_photos + len(arr_photo)) < 0:
        new_num_photos = len(photos) - len(arr_photo)
        if new_num_photos == 0:
            await update.message.reply_text("Rimangono 0 foto, ripartiamo!")
            os.remove(file_path)
            arr_photo = []
            giavisto = 0
        else:
            num_photos = new_num_photos
            await update.message.reply_text(f"Stiamo finendo le foto nuove da mandarti, ne rimangono {num_photos}")

    # Scelgo un file random dalla cartella per il numero specificato
    for i in range(num_photos): 
        # Faccio in modo di non avere foto uguali
        while True:
            selected_photo = random.choice(photos)
            if selected_photo not in arr_photo:
                arr_photo.append(selected_photo)
                break
        
        photo_path = os.path.join(photo_folder, arr_photo[i + giavisto]) # Path totale alla foto random
        temp = True # cambia se trovo un'immagine di dimensioni troppo grandi
        # Check delle dimensioni dell'immagine
        image = Image.open(photo_path)
        # Ottieni le dimensioni (larghezza, altezza)
        width, height = image.size
        if width >= 3000 or height >= 3000:
            new_width = int(width * 0.5)
            new_height = int(height * 0.5)
            # Ottieni la modalità dell'immagine
            mode = image.mode
            if mode == "RGBA" or "JPEG":
                # Converti l'immagine in RGB (senza canale alpha)
                image = image.convert('RGB')
            # Ridimensiona l'immagine
            image = image.resize((new_width, new_height))
            # Usa BytesIO per scrivere l'immagine in memoria
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='JPEG')
            img_bytes.seek(0)  # Torna all'inizio del file in memoria
            temp = False

        if num_photos != 1:
            caption_text = f'{i+1}/{num_photos}'
        else:
            caption_text = ''

        # Invia la foto all'utente
        if temp:
            await update.message.reply_photo(photo=open(photo_path, 'rb'),caption=caption_text)
        else:
            await update.message.reply_photo(photo=img_bytes,caption=caption_text)
        await asyncio.sleep(10)
    
    # Salvo le foto mandate in un file .pkl
    with open(file_path, 'wb') as file:
        pickle.dump(arr_photo, file)
async def set_folder(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # fare un comando che prenda un input da utente il tipo di immagine (E o H) e cambia la folder da cui pesca le foto
    keyboard = [[InlineKeyboardButton("Robe chill", callback_data="E_button")],[InlineKeyboardButton("Sono curioso", callback_data="H_button")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Scegli una preferenza:", reply_markup=reply_markup)

# Gestione del clic sul pulsante
async def button_callback(update: Update, context: CallbackContext) -> None:
    
    query = update.callback_query
    choice = query.data
    await query.answer()  # Necessario per evitare messaggi "in sospeso" 

    # Ottengo username e lo cripto per riconoscerlo nei file
    username = query.from_user.username
    crypted = hashlib.sha256(username.encode()).hexdigest()
    pref_file_name = "Preferences.pkl"
    folder_path = "."
    
    match choice:
        case "E_button":
            folder_choice = "E_folder"
        case "H_button":
            folder_choice = "H_folder"

    # Ottengo preferenza dell'utente dal file "Preferences.pkl"
    file_path_preferences = os.path.join(folder_path, pref_file_name)
    if os.path.exists(file_path_preferences):
        # se esiste, ottengo la preferenza dell'utente o la setto io se l'utente è nuovo
        with open(pref_file_name, 'rb') as file:
            pref_list = pickle.load(file)
        pref_list[crypted] = folder_choice
        with open(pref_file_name, "wb") as file:
            pickle.dump(pref_list, file)
    else:
        # Creo il dizionarion
        pref_list = {str(crypted): "E_folder"}
        # Salvataggio del dizionario nel file .pkl
        with open(pref_file_name, "wb") as file:
            pickle.dump(pref_list, file)

    await query.edit_message_text(text="Preferenza registrata")

# Responses
def handle_responses(text: str)-> str:
    processed: str = text.lower()

    if "hello" in processed:
        return "hello"
    
    return "Non so di cosa tu stia parlando"

# Handler per gestire le reazioni
async def handle_reaction(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Verifica se l'update contiene una reazione
    print("OK")
    if update.message_reaction.new_reaction:
        print("Ok")
        reaction = update.message_reaction
        user = update.message_reaction.user
        message_id = update.message_reaction.message_id

        print(f'{reaction}, {user} e {message_id}')
        # print(f"User {user.username} reacted with {reaction} to message {message_id}")
        # # Puoi inviare una risposta o elaborare ulteriormente qui
        # await context.bot.send_message(
        #     chat_id=update.effective_chat.id,
        #     text=f"User {user.username} reacted with {reaction} to message ID {message_id}"
        # )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message_type: str = update.message.chat.type # Per capire il tipo di chat
    text: str = update.message.text # Testo immesso dall'user

    # Recupera ID user e se scrive in chat privata o in un gruppo
    # print(f"user({update.message.chat.id}) in {message_type}: '{text}'")

    if message_type == 'group':
        # Il bot risponde nei gruppi solo se è taggato
        if BOT_USERNAME in text:
            # processiamo solo il testo e non lo username del bot, lo rimpiazziamo con un vuoto '' ed eliminiamo eventuali spazi vuoti con strip()
            new_text: str = text.replace(BOT_USERNAME, '').strip()
            response: str = handle_responses(new_text)
        else:
            return
    else:
        # Se siamo in privato risponde anche se non taggato
        response: str = handle_responses(text)  
    
    # Risposta del bot a terminale di Python
    # print('Bot:', response) 
    
    # Bot messo in hold per ulteriori messaggi
    await update.message.reply_text(response)

async def waifu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    waifu_prop = update.message.text[6:]
    with open("Suggestions.txt", "a", encoding="utf-8") as file:
            file.write("\n- " + waifu_prop)

    await update.message.reply_text("Waifu aggiunta alla lista!")

async def send_message():
    USER_ID = 507724541
    bot = Bot(token=TOKEN)
    await bot.send_message(chat_id=USER_ID, text="✅ Il programma è stato avviato!")

# login errors
async def error(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f'Update {update} caused error {context.error}')

if __name__ == 'main':
    print('starting bot...')

    # Definisce lo start del bot, indetificato dal TOKEN
    app = Application.builder().token(TOKEN).build()

    # Commands  
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_handler(CommandHandler('start', start_command))
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(CommandHandler('Pic', send_photo))
    app.add_handler(CommandHandler('Waifu', waifu))
    app.add_handler(CommandHandler('Pref', set_folder))

    # Messages
    app.add_handler(MessageHandler(filters.TEXT, handle_message))
    app.add_handler(MessageHandler(filters.ALL, handle_reaction))  

    # Errors
    app.add_error_handler(error)

    print('Polling...')
    app.run_polling(poll_interval=1)