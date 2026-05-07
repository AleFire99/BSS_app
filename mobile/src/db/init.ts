import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

export let cardsDb: SQLite.SQLiteDatabase;
export let deckDb: SQLite.SQLiteDatabase;

const CARDS_DB_MODULE = require('../../assets/cards.db');

const DECK_SCHEMA = `
  CREATE TABLE IF NOT EXISTS Decks (
    DeckID    INTEGER PRIMARY KEY AUTOINCREMENT,
    Name      TEXT    NOT NULL,
    Notes     TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS DeckCards (
    DeckID  INTEGER NOT NULL REFERENCES Decks(DeckID) ON DELETE CASCADE,
    CardID  TEXT    NOT NULL,
    Count   INTEGER NOT NULL CHECK(Count >= 1),
    PRIMARY KEY (DeckID, CardID)
  );
`;

export async function initCardsDb(): Promise<void> {
  const asset = Asset.fromModule(CARDS_DB_MODULE);
  await asset.downloadAsync();

  const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
  const dbPath = `${sqliteDir}cards.db`;
  const info = await FileSystem.getInfoAsync(dbPath);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.localUri!, to: dbPath });
  }

  cardsDb = await SQLite.openDatabaseAsync('cards.db');
}

export async function initDeckDb(): Promise<void> {
  deckDb = await SQLite.openDatabaseAsync('deck.db');
  await deckDb.execAsync('PRAGMA foreign_keys = ON;');
  await deckDb.execAsync(DECK_SCHEMA);
}
