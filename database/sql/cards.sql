CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    card_id TEXT NOT NULL, -- e.g., "BSS01-001_p1"
    set_name TEXT,         -- e.g., "BSS01"
    image TEXT,            -- Path to the image file
    cost INTEGER NOT NULL, -- Card cost
    reduction TEXT,        -- JSON or comma-separated string of reductions
    symbols TEXT,          -- JSON or comma-separated string of symbols
    type TEXT NOT NULL,    -- e.g., "SPIRIT"
    rarity TEXT NOT NULL   -- e.g., "SAGA"
);
