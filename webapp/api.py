"""
BSS Companion API
Run from project root: uvicorn webapp.api:app --reload
"""
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional
import re
import sqlite3
import json as _json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

CARDS_DB = Path(__file__).parent.parent / "telegram_bot" / "cards.db"
USER_DB  = Path(__file__).parent.parent / "webapp"       / "user.db"
STATIC_DIR = Path(__file__).parent / "static"
SCHEMA_USER = Path(__file__).parent.parent / "database" / "user_schema.sql"

# ── DB helpers ────────────────────────────────────────────────────────────────

def _cards_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(CARDS_DB)
    conn.row_factory = sqlite3.Row
    return conn


def _user_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(USER_DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _init_user_db():
    conn = _user_conn()
    with open(SCHEMA_USER, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.close()


# ── Card cache (loaded at startup) ────────────────────────────────────────────

CARDS_CACHE: list[dict] = []
CARDS_BY_ID: dict[str, dict] = {}
KEYWORDS_DESC: dict[str, str] = {}         # name → description
KW_QA_MAP: dict[str, list[dict]] = {}      # name → [{question, answer}]
CARD_QA_CACHE: list[dict] = []             # [{card_id, card_name, question, answer}]
KEYWORD_QA_CACHE: list[dict] = []          # [{name, description, qa_count}]

_JSON_DIR = Path(__file__).parent.parent / "json"


def load_cards() -> list[dict]:
    conn = _cards_conn()
    try:
        cards: dict[str, dict] = {}
        for row in conn.execute("""
            SELECT c.CardID as id, c.Name as name,
                   ct.Name as type, s.Name as card_set,
                   c.Cost as cost, c.Rarity as rarity
            FROM Cards c
            JOIN CardTypes ct ON c.TypeID = ct.TypeID
            JOIN Sets s ON c.SetID = s.SetID
            ORDER BY c.CardID
        """):
            cards[row["id"]] = {
                "id": row["id"], "name": row["name"],
                "type": row["type"], "set": row["card_set"],
                "cost": row["cost"], "rarity": row["rarity"],
                "color": [], "subtypes": [], "symbols": [],
                "core": [], "effects": [],
            }

        for row in conn.execute("""
            SELECT cc.CardID, co.Name as color
            FROM CardColors cc JOIN Colors co USING (ColorID)
        """):
            if row["CardID"] in cards:
                cards[row["CardID"]]["color"].append(row["color"])

        for row in conn.execute("""
            SELECT cst.CardID, st.Name as subtype
            FROM CardSubtypes cst JOIN Subtypes st USING (SubtypeID)
        """):
            if row["CardID"] in cards:
                cards[row["CardID"]]["subtypes"].append(row["subtype"])

        for row in conn.execute("""
            SELECT csym.CardID, co.Name as symbol
            FROM CardSymbols csym
            JOIN Symbols sym USING (SymbolID)
            JOIN Colors co ON sym.ColorID = co.ColorID
        """):
            if row["CardID"] in cards:
                cards[row["CardID"]]["symbols"].append(row["symbol"])

        for row in conn.execute("""
            SELECT CardID, Level as lv, BP as bp, Cores as cores
            FROM Core ORDER BY CardID, Level
        """):
            if row["CardID"] in cards:
                cards[row["CardID"]]["core"].append({
                    "lv": row["lv"], "bp": row["bp"] or 0, "cores": row["cores"] or 0,
                })

        effect_map: dict[int, dict] = {}
        for row in conn.execute("""
            SELECT e.EffectID, e.CardID,
                   cond.Description as condition,
                   e.Description as details
            FROM Effects e
            LEFT JOIN Conditions cond ON e.ConditionID = cond.ConditionID
            ORDER BY e.EffectID
        """):
            if row["CardID"] in cards:
                effect_map[row["EffectID"]] = {
                    "_card_id": row["CardID"],
                    "condition": row["condition"],
                    "details": row["details"],
                    "levels": [], "keywords": [], "steps": [],
                }

        for row in conn.execute("""
            SELECT el.EffectID, core.Level
            FROM EffectLevels el JOIN Core core USING (CoreID)
            ORDER BY el.EffectID, core.Level
        """):
            if row["EffectID"] in effect_map:
                effect_map[row["EffectID"]]["levels"].append(row["Level"])

        for row in conn.execute("""
            SELECT ek.EffectID, kw.Name as name, ek.Modifier as modifier
            FROM EffectKeywords ek JOIN Keywords kw USING (KeywordID)
        """):
            if row["EffectID"] in effect_map:
                effect_map[row["EffectID"]]["keywords"].append({
                    "name": row["name"], "modifier": row["modifier"],
                })

        for row in conn.execute("""
            SELECT es.EffectID, st.Name as name
            FROM EffectSteps es JOIN Steps st USING (StepID)
        """):
            if row["EffectID"] in effect_map:
                effect_map[row["EffectID"]]["steps"].append(row["name"])

        for eff in effect_map.values():
            card_id = eff.pop("_card_id")
            cards[card_id]["effects"].append(eff)

        # Group alt-art variants (_p1, _p2…) under their base card
        _alt_re = re.compile(r'_p\d+$')
        base_cards: dict[str, dict] = {}
        for card_id, card in cards.items():
            card['alt_art_ids'] = []
            if not _alt_re.search(card_id):
                base_cards[card_id] = card
        for card_id, card in cards.items():
            if _alt_re.search(card_id):
                base_id = _alt_re.sub('', card_id)
                if base_id in base_cards:
                    base_cards[base_id]['alt_art_ids'].append(card_id)

        return list(base_cards.values())
    finally:
        conn.close()


# ── Pydantic models ───────────────────────────────────────────────────────────

class DeckCreate(BaseModel):
    name: str
    notes: Optional[str] = None

class DeckUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None

class DeckCardAdd(BaseModel):
    card_id: str
    count: int = 1

class DeckCardUpdate(BaseModel):
    count: int


# ── Deck helpers ──────────────────────────────────────────────────────────────

def _deck_stats(deck_id: int, conn: sqlite3.Connection) -> dict:
    row = conn.execute(
        "SELECT COALESCE(SUM(Count), 0) as total FROM DeckCards WHERE DeckID = ?",
        (deck_id,)
    ).fetchone()
    card_count = row["total"]

    deck_cards = conn.execute(
        "SELECT CardID, Count FROM DeckCards WHERE DeckID = ?", (deck_id,)
    ).fetchall()

    color_counts: dict[str, int] = {}
    type_counts:  dict[str, int] = {}
    total_cost = 0
    total_copies = 0

    for dc in deck_cards:
        card = CARDS_BY_ID.get(dc["CardID"])
        if not card:
            continue
        n = dc["Count"]
        for color in card["color"]:
            color_counts[color] = color_counts.get(color, 0) + n
        ct = card.get("type", "")
        if ct:
            type_counts[ct] = type_counts.get(ct, 0) + n
        total_cost   += card.get("cost", 0) * n
        total_copies += n

    avg_cost = round(total_cost / total_copies, 1) if total_copies > 0 else 0

    return {
        "card_count":  card_count,
        "colors":      color_counts,
        "type_counts": type_counts,
        "avg_cost":    avg_cost,
    }


def _deck_or_404(deck_id: int, conn: sqlite3.Connection) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM Decks WHERE DeckID = ?", (deck_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Deck {deck_id} not found")
    return row


# ── App lifecycle ─────────────────────────────────────────────────────────────

def _load_rulings():
    global KEYWORDS_DESC, KW_QA_MAP, CARD_QA_CACHE, KEYWORD_QA_CACHE

    # Keyword definitions
    f = _JSON_DIR / "keywords.json"
    if f.exists():
        KEYWORDS_DESC = {kw["name"]: kw["description"]
                         for kw in _json.loads(f.read_text("utf-8"))["keywords"]}

    # Keyword Q&A — "Card Effects \"Ascend\"" → extract name
    f = _JSON_DIR / "QA_keywords.json"
    if f.exists():
        for r in _json.loads(f.read_text("utf-8")):
            m = re.search(r'"([^"]+)"', r["Card Effects"])
            name = m.group(1) if m else r["Card Effects"]
            KW_QA_MAP.setdefault(name, []).append(
                {"question": r["Question"], "answer": r["Answer"]}
            )

    # Card Q&A
    f = _JSON_DIR / "QA_cards.json"
    if f.exists():
        CARD_QA_CACHE = [
            {"card_id": r["Card No."], "card_name": r["Card Name"],
             "question": r["Question"], "answer": r["Answer"]}
            for r in _json.loads(f.read_text("utf-8"))
        ]

    KEYWORD_QA_CACHE = [
        {"name": name, "description": desc, "qa_count": len(KW_QA_MAP.get(name, []))}
        for name, desc in sorted(KEYWORDS_DESC.items())
    ]
    print(f"[BSS API] Rulings: {len(KEYWORD_QA_CACHE)} keywords, "
          f"{len(CARD_QA_CACHE)} card Q&As")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global CARDS_CACHE, CARDS_BY_ID
    _init_user_db()
    CARDS_CACHE = load_cards()
    CARDS_BY_ID = {c["id"]: c for c in CARDS_CACHE}
    _load_rulings()
    print(f"[BSS API] Loaded {len(CARDS_CACHE)} cards")
    yield


app = FastAPI(title="BSS Companion API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Card routes ───────────────────────────────────────────────────────────────

@app.get("/api/cards")
def list_cards() -> list[dict]:
    return CARDS_CACHE

@app.get("/api/cards/{card_id}")
def get_card(card_id: str) -> dict:
    card = CARDS_BY_ID.get(card_id)
    if not card:
        raise HTTPException(status_code=404, detail=f"Card '{card_id}' not found")
    return card

@app.get("/api/subtypes")
def get_subtypes() -> list[str]:
    conn = _cards_conn()
    try:
        return [r["Name"] for r in conn.execute("SELECT Name FROM Subtypes ORDER BY Name")]
    finally:
        conn.close()

@app.get("/api/sets")
def get_sets() -> list[str]:
    conn = _cards_conn()
    try:
        return [r["Name"] for r in conn.execute("SELECT Name FROM Sets ORDER BY Name")]
    finally:
        conn.close()

@app.get("/api/keywords")
def get_keywords() -> list[str]:
    conn = _cards_conn()
    try:
        return [r["Name"] for r in conn.execute("SELECT Name FROM Keywords ORDER BY Name")]
    finally:
        conn.close()


# ── Deck routes ───────────────────────────────────────────────────────────────

@app.get("/api/decks")
def list_decks() -> list[dict]:
    conn = _user_conn()
    try:
        decks = conn.execute("SELECT * FROM Decks ORDER BY UpdatedAt DESC").fetchall()
        result = []
        for d in decks:
            stats = _deck_stats(d["DeckID"], conn)
            result.append({
                "id":         d["DeckID"],
                "name":       d["Name"],
                "notes":      d["Notes"],
                "created_at": d["CreatedAt"],
                "updated_at": d["UpdatedAt"],
                **stats,
            })
        return result
    finally:
        conn.close()


@app.post("/api/decks", status_code=201)
def create_deck(body: DeckCreate) -> dict:
    conn = _user_conn()
    try:
        cur = conn.execute(
            "INSERT INTO Decks (Name, Notes) VALUES (?, ?)",
            (body.name, body.notes)
        )
        conn.commit()
        deck_id = cur.lastrowid
        row = conn.execute("SELECT * FROM Decks WHERE DeckID = ?", (deck_id,)).fetchone()
        return {"id": row["DeckID"], "name": row["Name"], "notes": row["Notes"],
                "created_at": row["CreatedAt"], "updated_at": row["UpdatedAt"],
                "card_count": 0, "colors": {}}
    finally:
        conn.close()


@app.get("/api/decks/{deck_id}")
def get_deck(deck_id: int) -> dict:
    conn = _user_conn()
    try:
        d = _deck_or_404(deck_id, conn)
        cards = conn.execute(
            "SELECT CardID as card_id, Count as count FROM DeckCards WHERE DeckID = ?",
            (deck_id,)
        ).fetchall()
        stats = _deck_stats(deck_id, conn)
        return {
            "id":         d["DeckID"],
            "name":       d["Name"],
            "notes":      d["Notes"],
            "created_at": d["CreatedAt"],
            "updated_at": d["UpdatedAt"],
            "cards":      [{"card_id": r["card_id"], "count": r["count"]} for r in cards],
            **stats,
        }
    finally:
        conn.close()


@app.put("/api/decks/{deck_id}")
def update_deck(deck_id: int, body: DeckUpdate) -> dict:
    conn = _user_conn()
    try:
        _deck_or_404(deck_id, conn)
        if body.name is not None:
            conn.execute("UPDATE Decks SET Name = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?",
                         (body.name, deck_id))
        if body.notes is not None:
            conn.execute("UPDATE Decks SET Notes = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?",
                         (body.notes, deck_id))
        conn.commit()
        d = conn.execute("SELECT * FROM Decks WHERE DeckID = ?", (deck_id,)).fetchone()
        stats = _deck_stats(deck_id, conn)
        return {"id": d["DeckID"], "name": d["Name"], "notes": d["Notes"],
                "created_at": d["CreatedAt"], "updated_at": d["UpdatedAt"], **stats}
    finally:
        conn.close()


@app.delete("/api/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: int):
    conn = _user_conn()
    try:
        _deck_or_404(deck_id, conn)
        conn.execute("DELETE FROM Decks WHERE DeckID = ?", (deck_id,))
        conn.commit()
    finally:
        conn.close()


@app.post("/api/decks/{deck_id}/cards", status_code=201)
def add_card_to_deck(deck_id: int, body: DeckCardAdd) -> dict:
    if body.card_id not in CARDS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Card '{body.card_id}' not found")
    conn = _user_conn()
    try:
        _deck_or_404(deck_id, conn)
        existing = conn.execute(
            "SELECT Count FROM DeckCards WHERE DeckID = ? AND CardID = ?",
            (deck_id, body.card_id)
        ).fetchone()
        if existing:
            new_count = existing["Count"] + body.count
            conn.execute(
                "UPDATE DeckCards SET Count = ? WHERE DeckID = ? AND CardID = ?",
                (new_count, deck_id, body.card_id)
            )
        else:
            conn.execute(
                "INSERT INTO DeckCards (DeckID, CardID, Count) VALUES (?, ?, ?)",
                (deck_id, body.card_id, body.count)
            )
        conn.execute(
            "UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?",
            (deck_id,)
        )
        conn.commit()
        stats = _deck_stats(deck_id, conn)
        return {"deck_id": deck_id, "card_id": body.card_id, **stats}
    finally:
        conn.close()


@app.put("/api/decks/{deck_id}/cards/{card_id}")
def update_card_in_deck(deck_id: int, card_id: str, body: DeckCardUpdate) -> dict:
    conn = _user_conn()
    try:
        _deck_or_404(deck_id, conn)
        if body.count <= 0:
            conn.execute(
                "DELETE FROM DeckCards WHERE DeckID = ? AND CardID = ?",
                (deck_id, card_id)
            )
        else:
            conn.execute(
                "UPDATE DeckCards SET Count = ? WHERE DeckID = ? AND CardID = ?",
                (body.count, deck_id, card_id)
            )
        conn.execute(
            "UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?",
            (deck_id,)
        )
        conn.commit()
        stats = _deck_stats(deck_id, conn)
        return {"deck_id": deck_id, "card_id": card_id, **stats}
    finally:
        conn.close()


@app.delete("/api/decks/{deck_id}/cards/{card_id}", status_code=204)
def remove_card_from_deck(deck_id: int, card_id: str):
    conn = _user_conn()
    try:
        _deck_or_404(deck_id, conn)
        conn.execute(
            "DELETE FROM DeckCards WHERE DeckID = ? AND CardID = ?",
            (deck_id, card_id)
        )
        conn.execute(
            "UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?",
            (deck_id,)
        )
        conn.commit()
    finally:
        conn.close()


# ── Rulings routes ───────────────────────────────────────────────────────────

@app.get("/api/rulings/keywords")
def list_keywords_with_desc() -> list[dict]:
    return KEYWORD_QA_CACHE


@app.get("/api/rulings/keywords/{name}")
def get_keyword_detail(name: str) -> dict:
    return {
        "name": name,
        "description": KEYWORDS_DESC.get(name, ""),
        "qa": KW_QA_MAP.get(name, []),
    }


@app.get("/api/rulings/cards")
def list_card_rulings() -> list[dict]:
    return CARD_QA_CACHE


@app.get("/api/rulings/cards/{card_id}")
def get_card_rulings_by_id(card_id: str) -> list[dict]:
    return [
        {"question": r["question"], "answer": r["answer"]}
        for r in CARD_QA_CACHE if r["card_id"] == card_id
    ]


# ── Static frontend ───────────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))
