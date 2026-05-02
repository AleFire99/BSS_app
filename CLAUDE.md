# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

Companion app for the **Battle Spirits Saga (BSS)** trading card game. Components:
- Card database (SQLite) with full card data scraped from https://www.bssdb.dev
- Telegram inline bot for card search (deployed via Docker)
- Planned: web/mobile companion app with deck building and hand simulation

## Commands

### Telegram Bot (local dev)
```powershell
cd telegram_bot
pip install -r app_requirements.txt
python telegram_bot.py        # requires .env with BOT_TOKEN
```

### Telegram Bot (Docker)
```powershell
# Build and push to Docker Hub
cd telegram_bot
docker build -t alefire/bss-bot:latest -t alefire/bss-bot:v11 .
docker push alefire/bss-bot:latest && docker push alefire/bss-bot:v11

# Deploy (any machine)
docker compose -f docker_compose.yaml up -d
docker logs bss-bot -f
```

### Database population
```powershell
# Run from project root — deletes and recreates telegram_bot/cards.db
python scripts/populate_db.py
```

### Data scraping (Jupyter)
```powershell
pip install -r requirements.txt
jupyter notebook scripts/scraper.ipynb         # scrape card data → json/Sets/
jupyter notebook scripts/image_scraper.ipynb   # download card images → images/
jupyter notebook scripts/FAQ_extractor.ipynb   # extract Q&A from PDFs → json/
```

## Architecture

### Data Flow
```
bssdb.dev → [scraper.ipynb] → json/Sets/[SET]/[ID].json
                            → images/[SET]/[ID].png
json/ → [populate_db.py] → telegram_bot/cards.db (SQLite)
telegram_bot/cards.db → [Docker COPY] → /app/cards.db inside container
/app/cards.db → telegram_bot.py → Telegram inline queries
```

### Key Files
| File | Role |
|------|------|
| `telegram_bot/telegram_bot.py` | Bot entrypoint; inline query handler with LRU cache |
| `telegram_bot/cards.db` | Live DB — rebuilt by `populate_db.py`, bundled into Docker image |
| `database/schema.sql` | Full DB schema — source of truth for all schema changes |
| `database/Diagram.md` | Mermaid ER diagram of full schema |
| `scripts/populate_db.py` | JSON → SQLite loader; reads schema.sql, writes telegram_bot/cards.db |
| `scripts/scraper.ipynb` | Selenium scraper for card data |
| `json/keywords.json` | All ~50+ game keyword definitions |
| `json/QA_cards.json` | Per-card rulings/Q&A |
| `json/QA_keywords.json` | Per-keyword rulings/Q&A |

### Database Schema (SQLite)

Fully normalized. See `database/schema.sql` for DDL, `database/Diagram.md` for ER diagram.

**Lookup tables:** `CardTypes` (SPIRIT/MAGIC/NEXUS), `Sets`, `Colors`, `Symbols`, `Subtypes`, `Keywords`, `Steps`, `Conditions`

**Cards** links to lookups via junction tables — no multi-value FKs on the main table:
- `CardColors`, `CardSymbols`, `CardSubtypes` — many-to-many
- `CardReductions(CardID, ColorID, Count)` — e.g. 2 red + 1 blue = two rows

**Core** stores per-level stats (Level, BP, Cores) for SPIRIT and NEXUS cards.

**Effects** → `EffectLevels` (which Core levels activate it), `EffectKeywords` (keyword + optional modifier), `EffectSteps` (Main/Flash timing).

**Q&A:** `QA_cards`, `QA_keywords`

### Card JSON Format
Each card at `json/Sets/[SET]/[SET]-[NUM].json`:
```json
{
  "name": "...", "ID": "BSS01-001", "set": "BSS01",
  "color": ["Red"], "cost": "8", "reduction": ["red","red","red"],
  "symbols": ["red"], "cardType": "SPIRIT",
  "subType": ["STAR DRAGON", "VALIANT HERO"], "rarity": "X",
  "effects": [{
    "levels": [2, 3], "condition": "When This Spirit Attacks",
    "keywords": [{"keyword_name": "Ascend", "keyword_modifier": 6}],
    "details": "...", "steps": []
  }],
  "core_requirements": [{"level": 1, "battlePoints": 5000, "cores": 1}]
}
```
`keyword_modifier` can be an integer, null, or a list `[4,5]` (stored as `"4,5"` in DB).
MAGIC cards have no `core_requirements`; effect `steps` hold timing (`["Main","Flash"]`).
NEXUS cards have `core_requirements` with `battlePoints: 0`.

### Telegram Bot Search Filters
Bot handles inline queries with these filter prefixes:
- `cost [n]` — filter by cost
- `color [name]` — filter by color (Red, Blue, Green, Yellow, Purple, White)
- `type [name]` — filter by card type (spirit, magic, nexus)
- `rarity [level]` — filter by rarity (C, UC, R, X, etc.)
- Free text — fuzzy name search

Results: up to 50 inline photo results. Card images served from `https://www.bssdb.dev/cards/bss/{card_id}.png`.

### Card Sets
BSS01–BSS06 (base), ST01–ST07 (starter), CB01 (collaboration), EX01, L01, PR (promos). ~1,488 total card JSON files.

## Workflow: Adding New Cards / Schema Changes

1. Scrape new data with `scraper.ipynb` → new JSON files in `json/Sets/`
2. If schema changes: edit `database/schema.sql` and `database/Diagram.md`
3. Run `python scripts/populate_db.py` from project root (rebuilds `telegram_bot/cards.db`)
4. Rebuild and push Docker image:
   ```powershell
   cd telegram_bot
   docker build -t alefire/bss-bot:latest -t alefire/bss-bot:vNN .
   docker push alefire/bss-bot:latest && docker push alefire/bss-bot:vNN
   ```

## Environment

Bot needs `BOT_TOKEN` in `telegram_bot/.env` or as env var in Docker. The `.env` file is gitignored. Production token is embedded in `docker_compose.yaml` (treat as sensitive).

`images/` and `*/QA`, `*/Manuals` directories are gitignored (large assets).
