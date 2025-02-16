CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    card_id TEXT NOT NULL,
    set_name TEXT,
    image TEXT NOT NULL,
    cost INTEGER NOT NULL,
    reduction TEXT,
    symbols TEXT,
    type TEXT NOT NULL,
    rarity TEXT NOT NULL,
    UNIQUE(card_id, image) -- Composite unique constraint
);

