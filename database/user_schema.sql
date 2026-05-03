PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `Decks` (
  `DeckID`    INTEGER PRIMARY KEY AUTOINCREMENT,
  `Name`      TEXT    NOT NULL,
  `Notes`     TEXT,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CardID references cards.db Cards.CardID (cross-DB, no FK enforced)
CREATE TABLE IF NOT EXISTS `DeckCards` (
  `DeckID`  INTEGER NOT NULL,
  `CardID`  TEXT    NOT NULL,
  `Count`   INTEGER NOT NULL DEFAULT 1 CHECK (Count >= 1),
  PRIMARY KEY (`DeckID`, `CardID`),
  FOREIGN KEY (`DeckID`) REFERENCES `Decks` (`DeckID`) ON DELETE CASCADE
);
