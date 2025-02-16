CREATE TABLE effect_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    effect_id INTEGER NOT NULL,
    level INTEGER NOT NULL, -- Levels associated with the effect (1, 2, 3)
    FOREIGN KEY (effect_id) REFERENCES effects (id) ON DELETE CASCADE
);
