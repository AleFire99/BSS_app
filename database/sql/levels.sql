CREATE TABLE levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    level INTEGER NOT NULL,        -- Level (1, 2, or 3)
    battle_points INTEGER NOT NULL,-- Battle points for the level
    cores INTEGER NOT NULL,        -- Number of cores required
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
);
