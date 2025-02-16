CREATE TABLE effect_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    effect_id INTEGER NOT NULL,
    keyword_id INTEGER NOT NULL,
    keyword_modifier INTEGER, -- Modifier for the keyword, if applicable
    FOREIGN KEY (effect_id) REFERENCES effects (id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords (id) ON DELETE CASCADE
);
