"""
Translate BSS card data (name, subtypes, effect details) EN→IT.
Output: mobile/assets/i18n/cards_it.json

Uses Argos Translate — fully offline, no API keys, no rate limits.

Usage:
    pip install argostranslate
    python scripts/translate_cards_it.py   # downloads en→it model on first run (~100MB)

Saves every 200 strings — safe to interrupt and re-run. Already-done cards are skipped.
"""

import json
import time
from pathlib import Path

# ── Argos Translate setup ─────────────────────────────────────────────────────

try:
    import argostranslate.package
    import argostranslate.translate
except ImportError:
    raise SystemExit("Run: pip install argostranslate")

def ensure_en_it_model() -> None:
    """Download and install en→it language pack if not already present."""
    installed = argostranslate.package.get_installed_packages()
    if any(p.from_code == "en" and p.to_code == "it" for p in installed):
        print("en->it model already installed.", flush=True)
        return
    print("Downloading en→it language model (~100 MB)...", flush=True)
    argostranslate.package.update_package_index()
    available = argostranslate.package.get_available_packages()
    pkg = next((p for p in available if p.from_code == "en" and p.to_code == "it"), None)
    if not pkg:
        raise SystemExit("en->it package not found in Argos index.")
    argostranslate.package.install_from_path(pkg.download())
    print("Model installed.", flush=True)

ensure_en_it_model()

# ── Terms to keep in English (replaced with tokens before/after translation) ──

_PROTECTED = [
    # keyword names
    "A.T. Field", "Bloodcurse", "Immortal", "Confront",
    "Blessed", "Ascend", "Awaken", "Burst", "Chain", "Crush", "Curse",
    "Feast", "Agile", "Armor", "Astral", "Gale", "Link", "Luster", "Raid", "Swift",
    # game zones / resources
    "Soul Cores", "Soul Core",
    "Flash Step", "Main Step", "Attack Step",
    "Main",
    "Spirits", "Spirit",
    "Nexuses", "Nexus",
    "Magic",
    "Trash",
    "void",
    "Cores", "Core",
    "Flash",
    "Brave",
    "BP",
]

# Sort longest first so "Soul Cores" matched before "Soul Core"
_PROTECTED.sort(key=len, reverse=True)

import re as _re

# Combined pattern: match any protected term (longest first)
_PATTERN = _re.compile('|'.join(_re.escape(t) for t in _PROTECTED))

def translate(text: str) -> str:
    """Translate text while keeping protected terms unchanged.

    Splits text on protected terms, translates each gap, reassembles.
    Protected terms are never passed to the translator.
    """
    parts: list[tuple[bool, str]] = []  # (is_protected, chunk)
    last = 0
    for m in _PATTERN.finditer(text):
        if m.start() > last:
            parts.append((False, text[last:m.start()]))
        parts.append((True, m.group()))
        last = m.end()
    if last < len(text):
        parts.append((False, text[last:]))

    out = []
    for protected, chunk in parts:
        if protected:
            out.append(chunk)
        elif chunk.strip():
            # Preserve leading/trailing whitespace stripped by translator
            lead  = chunk[: len(chunk) - len(chunk.lstrip())]
            trail = chunk[len(chunk.rstrip()):]
            tr = argostranslate.translate.translate(chunk.strip(), "en", "it") or chunk.strip()
            out.append(lead + tr + trail)
        else:
            out.append(chunk)
    return "".join(out)

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT   = Path(__file__).parent.parent
SETS_DIR    = REPO_ROOT / "json" / "Sets"
OUTPUT_FILE = REPO_ROOT / "mobile" / "assets" / "i18n" / "cards_it.json"
SAVE_EVERY  = 200

# ── Load existing (resume support) ────────────────────────────────────────────

output: dict = {}
if OUTPUT_FILE.exists():
    with open(OUTPUT_FILE, encoding="utf-8-sig") as f:
        output = json.load(f)
print(f"Loaded {len(output)} existing translations.", flush=True)

# ── Collect cards ─────────────────────────────────────────────────────────────

card_files = sorted(SETS_DIR.glob("**/*.json"))
print(f"Found {len(card_files)} card files.", flush=True)

cards: dict[str, dict] = {}
for path in card_files:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    card_id = data.get("ID", "")
    if not card_id or card_id in output:
        continue
    effects = [
        e["details"] for e in data.get("effects", [])
        if e.get("details") and e["details"] not in ("N/A", "")
    ]
    if not effects:
        continue  # skip cards with no translatable effect text
    cards[card_id] = {"effects": effects}

print(f"{len(cards)} cards to translate (skipping {len(output)} already done).", flush=True)

# ── Build task list ───────────────────────────────────────────────────────────

tasks: list[tuple[str, str, int | None, str]] = []
for card_id, fields in cards.items():
    for i, eff in enumerate(fields["effects"]):
        tasks.append((card_id, "effect", i, eff))

total = len(tasks)
print(f"{total} strings to translate.", flush=True)

# ── Translation state ─────────────────────────────────────────────────────────

pending: dict[str, dict] = {
    cid: {"effects": list(f["effects"])}
    for cid, f in cards.items()
}
remaining: dict[str, int] = {
    cid: len(f["effects"]) for cid, f in cards.items()
}

def save() -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

# ── Translate ─────────────────────────────────────────────────────────────────

start = time.time()
for idx, (card_id, field, pos, text) in enumerate(tasks):
    tr = translate(text)

    p = pending[card_id]
    if field == "effect" and pos is not None and pos < len(p["effects"]):
        p["effects"][pos] = tr

    remaining[card_id] -= 1
    if remaining[card_id] == 0:
        output[card_id] = {"effects": p["effects"]}

    if (idx + 1) % SAVE_EVERY == 0 or idx == total - 1:
        save()
        elapsed = time.time() - start
        rate = (idx + 1) / elapsed if elapsed > 0 else 0
        eta = (total - idx - 1) / rate if rate > 0 else 0
        print(
            f"  {idx+1}/{total} strings | {len(output)} cards saved"
            f" | {rate:.1f} str/s | ETA {eta/60:.1f} min",
            flush=True,
        )

print(f"\nDone. {len(output)} cards in {OUTPUT_FILE}", flush=True)
