CREATE TABLE effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    condition TEXT,     -- Condition for the effect, e.g., "When Summoned"
    details TEXT,       -- Detailed description of the effect
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
);
