import os
import json
import sqlite3
from pathlib import Path
from collections import Counter

# Run from project root: python scripts/populate_db.py
DB_FILE = "telegram_bot/cards.db"
JSON_DIR = "json/Sets"
SCHEMA_FILE = "database/schema.sql"

COLORS = ["Red", "Blue", "Green", "Yellow", "Purple", "White"]
CARD_TYPES = ["SPIRIT", "MAGIC", "NEXUS"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_insert(cur, table, col, value, pk_col):
    cur.execute(f"SELECT `{pk_col}` FROM `{table}` WHERE `{col}` = ?", (value,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(f"INSERT INTO `{table}` (`{col}`) VALUES (?)", (value,))
    return cur.lastrowid


def get_color_id(cur, name):
    normalized = name.strip().capitalize()
    cur.execute("SELECT ColorID FROM Colors WHERE Name = ?", (normalized,))
    row = cur.fetchone()
    return row[0] if row else None


def get_symbol_id_by_color(cur, color_name):
    cur.execute("""
        SELECT s.SymbolID FROM Symbols s
        JOIN Colors c ON s.ColorID = c.ColorID
        WHERE c.Name = ?
    """, (color_name.strip().capitalize(),))
    row = cur.fetchone()
    return row[0] if row else None


# ── Setup ─────────────────────────────────────────────────────────────────────

def create_schema(conn):
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        conn.executescript(f.read())


def seed_lookups(cur):
    for t in CARD_TYPES:
        cur.execute("INSERT OR IGNORE INTO CardTypes (Name) VALUES (?)", (t,))

    for color in COLORS:
        cur.execute("INSERT OR IGNORE INTO Colors (Name) VALUES (?)", (color,))
        cur.execute("SELECT ColorID FROM Colors WHERE Name = ?", (color,))
        color_id = cur.fetchone()[0]
        cur.execute(
            "INSERT OR IGNORE INTO Symbols (Name, Image, ColorID) VALUES (?, ?, ?)",
            (color, f"images/symbols/{color.lower()}.png", color_id),
        )


# ── Per-card insertion ────────────────────────────────────────────────────────

def insert_card(cur, data):
    card_id = data["ID"]
    set_name = data.get("set", card_id[:5])
    card_type = data.get("cardType", "SPIRIT")
    cost_raw = data.get("cost", "0")
    cost = int(cost_raw) if cost_raw else 0

    cur.execute("SELECT TypeID FROM CardTypes WHERE Name = ?", (card_type,))
    type_id = cur.fetchone()[0]
    set_id = get_or_insert(cur, "Sets", "Name", set_name, "SetID")

    cur.execute("""
        INSERT OR IGNORE INTO Cards (CardID, Name, TypeID, SetID, Cost, Image, Rarity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (card_id, data["name"], type_id, set_id, cost,
          data.get("image", ""), data.get("rarity")))

    # CardColors
    for color in data.get("color", []):
        color_id = get_color_id(cur, color)
        if color_id:
            cur.execute("INSERT OR IGNORE INTO CardColors (CardID, ColorID) VALUES (?, ?)",
                        (card_id, color_id))

    # CardSymbols
    for sym in data.get("symbols", []):
        symbol_id = get_symbol_id_by_color(cur, sym)
        if symbol_id:
            cur.execute("INSERT OR IGNORE INTO CardSymbols (CardID, SymbolID) VALUES (?, ?)",
                        (card_id, symbol_id))

    # CardSubtypes
    for subtype in data.get("subType", []):
        if subtype:
            subtype_id = get_or_insert(cur, "Subtypes", "Name", subtype.upper(), "SubtypeID")
            cur.execute("INSERT OR IGNORE INTO CardSubtypes (CardID, SubtypeID) VALUES (?, ?)",
                        (card_id, subtype_id))

    # CardReductions — count per color (e.g. ["red","red","blue"] → Red:2, Blue:1)
    counts = Counter(r.capitalize() for r in data.get("reduction", []))
    for color_name, count in counts.items():
        color_id = get_color_id(cur, color_name)
        if color_id:
            cur.execute("""
                INSERT OR IGNORE INTO CardReductions (CardID, ColorID, Count)
                VALUES (?, ?, ?)
            """, (card_id, color_id, count))

    # Core levels → build level→CoreID map for EffectLevels below
    core_id_map = {}
    for core in data.get("core_requirements", []):
        level = core["level"]
        cur.execute("""
            INSERT OR IGNORE INTO Core (CardID, Level, BP, Cores) VALUES (?, ?, ?, ?)
        """, (card_id, level, core.get("battlePoints", 0), core.get("cores", 0)))
        cur.execute("SELECT CoreID FROM Core WHERE CardID = ? AND Level = ?", (card_id, level))
        core_id_map[level] = cur.fetchone()[0]

    # Effects
    for effect in data.get("effects", []):
        raw_condition = effect.get("condition", "N/A")
        condition_id = None
        if raw_condition and raw_condition != "N/A":
            condition_id = get_or_insert(cur, "Conditions", "Description",
                                         raw_condition, "ConditionID")

        raw_desc = effect.get("details", "")
        description = None if (not raw_desc or raw_desc == "N/A") else raw_desc

        cur.execute("""
            INSERT INTO Effects (CardID, ConditionID, Description) VALUES (?, ?, ?)
        """, (card_id, condition_id, description))
        effect_id = cur.lastrowid

        # EffectLevels
        for level in effect.get("levels", []):
            core_id = core_id_map.get(level)
            if core_id:
                cur.execute("""
                    INSERT OR IGNORE INTO EffectLevels (EffectID, CoreID) VALUES (?, ?)
                """, (effect_id, core_id))

        # EffectKeywords
        for kw in effect.get("keywords", []):
            kw_name = kw.get("keyword_name")
            if kw_name:
                kw_id = get_or_insert(cur, "Keywords", "Name", kw_name, "KeywordID")
                modifier = kw.get("keyword_modifier")
                if isinstance(modifier, list):
                    modifier = ",".join(str(m) for m in modifier)
                elif modifier is not None:
                    modifier = str(modifier)
                cur.execute("""
                    INSERT OR IGNORE INTO EffectKeywords (EffectID, KeywordID, Modifier)
                    VALUES (?, ?, ?)
                """, (effect_id, kw_id, modifier))

        # EffectSteps
        for step_name in effect.get("steps", []):
            if step_name:
                step_id = get_or_insert(cur, "Steps", "Name", step_name, "StepID")
                cur.execute("""
                    INSERT OR IGNORE INTO EffectSteps (EffectID, StepID) VALUES (?, ?)
                """, (effect_id, step_id))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)

    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON")

    create_schema(conn)

    cur = conn.cursor()
    seed_lookups(cur)

    json_files = sorted(Path(JSON_DIR).rglob("*.json"))
    errors = []

    for file_path in json_files:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        try:
            insert_card(cur, data)
        except Exception as e:
            errors.append((file_path.name, str(e)))

    conn.commit()
    conn.close()

    print(f"Done. {len(json_files)} files processed, {len(errors)} errors.")
    for name, err in errors:
        print(f"  ERROR {name}: {err}")


if __name__ == "__main__":
    main()
