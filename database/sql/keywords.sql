CREATE TABLE keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,       -- Keyword name, e.g., "Ascend"
    description TEXT NOT NULL        -- Description of the keyword
);
