import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

export let cardsDb: SQLite.SQLiteDatabase;
export let deckDb: SQLite.SQLiteDatabase;

const CARDS_DB_MODULE = require('../../assets/cards.db');

// ── Schema migration ──────────────────────────────────────────────────────────

async function migrateToV1(): Promise<void> {
  const deckCardsExists = await deckDb.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='DeckCards'`,
  );

  await deckDb.withTransactionAsync(async () => {
    await deckDb.execAsync(
      `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`,
    );

    if (deckCardsExists) {
      // Existing install: migrate old DeckCards (no Section column) → new schema
      await deckDb.execAsync(`
        CREATE TABLE DeckCards_old AS SELECT DeckID, CardID, Count FROM DeckCards;
        DROP TABLE DeckCards;
        CREATE TABLE DeckCards (
          DeckID  INTEGER NOT NULL REFERENCES Decks(DeckID) ON DELETE CASCADE,
          CardID  TEXT    NOT NULL,
          Count   INTEGER NOT NULL CHECK(Count >= 1),
          Section TEXT    NOT NULL DEFAULT 'main' CHECK(Section IN ('main', 'sideboard')),
          PRIMARY KEY (DeckID, CardID, Section)
        );
        INSERT INTO DeckCards SELECT DeckID, CardID, Count, 'main' FROM DeckCards_old;
        DROP TABLE DeckCards_old;
      `);
    } else {
      // Fresh install: create all tables from scratch
      await deckDb.execAsync(`
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
          Section TEXT    NOT NULL DEFAULT 'main' CHECK(Section IN ('main', 'sideboard')),
          PRIMARY KEY (DeckID, CardID, Section)
        );
      `);
    }

    await deckDb.execAsync(`
      CREATE TABLE IF NOT EXISTS SwapPlans (
        PlanID INTEGER PRIMARY KEY AUTOINCREMENT,
        DeckID INTEGER NOT NULL REFERENCES Decks(DeckID) ON DELETE CASCADE,
        Name   TEXT    NOT NULL,
        Notes  TEXT
      );
      CREATE TABLE IF NOT EXISTS SwapPlanCards (
        PlanID    INTEGER NOT NULL REFERENCES SwapPlans(PlanID) ON DELETE CASCADE,
        CardID    TEXT    NOT NULL,
        Direction TEXT    NOT NULL CHECK(Direction IN ('out', 'in')),
        Count     INTEGER NOT NULL CHECK(Count >= 1),
        PRIMARY KEY (PlanID, CardID, Direction)
      );
    `);

    await deckDb.runAsync('DELETE FROM schema_version');
    await deckDb.runAsync('INSERT INTO schema_version VALUES (?)', [1]);
  });
}

async function runMigrations(): Promise<void> {
  const versionTable = await deckDb.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`,
  );

  let currentVersion = 0;
  if (versionTable) {
    const row = await deckDb.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version',
    );
    currentVersion = row?.version ?? 0;
  }

  if (currentVersion < 1) await migrateToV1();
}

// ── Public init ───────────────────────────────────────────────────────────────

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
  await runMigrations();
}
