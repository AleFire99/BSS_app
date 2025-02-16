CREATE TABLE effect_levels (
    effect_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    FOREIGN KEY (effect_id) REFERENCES effects (id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels (id) ON DELETE CASCADE,
    PRIMARY KEY (effect_id, level_id)
);

