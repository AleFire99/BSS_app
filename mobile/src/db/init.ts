import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

export let cardsDb: SQLite.SQLiteDatabase;
export let deckDb: SQLite.SQLiteDatabase;

const DECK_SCHEMA = `
  CREATE TABLE IF NOT EXISTS Decks (
    DeckID   INTEGER PRIMARY KEY AUTOINCREMENT,
    Name     TEXT    NOT NULL,
    Notes    TEXT,
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

export async function initDatabases(): Promise<void> {
  const targetPath = FileSystem.documentDirectory! + 'cards.db';
  const info = await FileSystem.getInfoAsync(targetPath);

  if (!info.exists) {
    const asset = Asset.fromModule(require('../../assets/cards.db'));
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('cards.db asset has no localUri after download');
    await FileSystem.copyAsync({ from: asset.localUri, to: targetPath });
  }

  cardsDb = await SQLite.openDatabaseAsync('cards.db');
  deckDb  = await SQLite.openDatabaseAsync('deck.db');

  await deckDb.execAsync('PRAGMA foreign_keys = ON;');
  await deckDb.execAsync(DECK_SCHEMA);
}
