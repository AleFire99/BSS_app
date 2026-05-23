"""
Fix Italian grammar/syntax in cards_it.json using a local Ollama model.
Preserves all game-specific English terms (keywords, BP, void, etc.)

Usage:
    1. Install Ollama: https://ollama.com
    2. Pull a model: ollama pull mistral   (or llama3.1, qwen2.5, etc.)
    3. Run Ollama:   ollama serve
    4. python scripts/fix_translations_grammar.py

Safe to interrupt and re-run — progress saved every batch.
"""

import json
import os
import time
import requests
from pathlib import Path

OLLAMA_URL  = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL       = os.environ.get("OLLAMA_MODEL", "mistral")
BATCH_SIZE  = 20   # effects per prompt (smaller = more reliable output parsing)

SYSTEM_PROMPT = """Sei un esperto traduttore italiano specializzato in testi di giochi di carte collezionabili.
Il tuo compito: correggere gli errori grammaticali e sintattici nei testi degli effetti delle carte.

REGOLE TASSATIVE:
1. Mantieni questi termini ESATTAMENTE in inglese (non tradurli mai):
   Ascend, Awaken, Burst, Chain, Confront, Crush, Curse, Feast, Agile, Armor, Astral,
   Gale, Link, Luster, Raid, Swift, Blessed, Bloodcurse, Immortal, A.T. Field,
   Soul Core, Soul Cores, BP, void, Spirit, Spirits, Nexus, Nexuses, Magic,
   Trash, Core, Cores, Flash, Flash Step, Main, Main Step, Attack Step, Brave
2. Correggi SOLO grammatica, ordine delle parole, accordo, coniugazione verbale — il significato deve restare identico
3. Restituisci SOLO le righe corrette in italiano, nient'altro
4. Un effetto corretto per riga, stesso ordine dell'input
5. Nessuna spiegazione, numerazione o testo extra"""

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT     = Path(__file__).parent.parent
INPUT_FILE    = REPO_ROOT / "mobile" / "assets" / "i18n" / "cards_it.json"
PROGRESS_FILE = REPO_ROOT / "mobile" / "assets" / "i18n" / ".grammar_progress.json"

# ── Check Ollama is reachable ─────────────────────────────────────────────────

try:
    r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
    models = [m["name"].split(":")[0] for m in r.json().get("models", [])]
    if MODEL not in models and MODEL.split(":")[0] not in models:
        print(f"Warning: '{MODEL}' not found. Available: {models}")
        print(f"Run: ollama pull {MODEL}")
    else:
        print(f"Ollama ready. Using model: {MODEL}", flush=True)
except Exception as e:
    raise SystemExit(f"Cannot reach Ollama at {OLLAMA_URL}: {e}\nRun: ollama serve")

# ── Load data ─────────────────────────────────────────────────────────────────

cards_it: dict = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
print(f"Loaded {len(cards_it)} cards.", flush=True)

done_ids: set = set()
if PROGRESS_FILE.exists():
    done_ids = set(json.loads(PROGRESS_FILE.read_text(encoding="utf-8")))
    print(f"Resuming — {len(done_ids)} cards already fixed.", flush=True)

# ── Build work list ───────────────────────────────────────────────────────────

tasks: list[tuple[str, int, str]] = []
for card_id, entry in cards_it.items():
    if card_id in done_ids:
        continue
    for i, eff in enumerate(entry.get("effects", [])):
        tasks.append((card_id, i, eff))

total = len(tasks)
print(f"{total} effects to fix across {len(set(t[0] for t in tasks))} cards.", flush=True)

# ── Mutable working copy ──────────────────────────────────────────────────────

fixed: dict = {
    cid: {"effects": list(entry.get("effects", []))}
    for cid, entry in cards_it.items()
}

def save() -> None:
    INPUT_FILE.write_text(json.dumps(fixed, ensure_ascii=False, indent=2), encoding="utf-8")
    PROGRESS_FILE.write_text(json.dumps(sorted(done_ids)), encoding="utf-8")

def ollama_fix(texts: list[str]) -> list[str]:
    user_msg = "\n".join(texts)
    payload = {
        "model":  MODEL,
        "system": SYSTEM_PROMPT,
        "prompt": user_msg,
        "stream": False,
        "options": {"temperature": 0.1},
    }
    r = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=120)
    r.raise_for_status()
    reply = r.json()["response"].strip()
    lines = [l.strip() for l in reply.split("\n") if l.strip()]
    # If model added numbering like "1. text", strip it
    cleaned = []
    for line in lines:
        if line and line[0].isdigit() and ". " in line[:4]:
            line = line.split(". ", 1)[1]
        cleaned.append(line)
    return cleaned

# ── Process ───────────────────────────────────────────────────────────────────

start = time.time()
i = 0

while i < total:
    batch = tasks[i : i + BATCH_SIZE]
    texts = [t[2] for t in batch]

    for attempt in range(3):
        try:
            corrected = ollama_fix(texts)
            # Verify line count matches (model may merge/split lines)
            if len(corrected) != len(texts):
                print(f"  Line count mismatch ({len(corrected)} vs {len(texts)}), retrying...", flush=True)
                if attempt < 2:
                    continue
                else:
                    corrected = texts  # fallback: keep originals
            break
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}", flush=True)
            time.sleep(5)
    else:
        corrected = texts

    # Apply corrections
    for (card_id, eff_idx, _orig), corr in zip(batch, corrected):
        if eff_idx < len(fixed[card_id]["effects"]):
            fixed[card_id]["effects"][eff_idx] = corr

    # Mark fully-processed cards
    batch_card_ids = set(t[0] for t in batch)
    for cid in batch_card_ids:
        if not any(t[0] == cid for t in tasks[i + BATCH_SIZE:]):
            done_ids.add(cid)

    i += BATCH_SIZE
    elapsed = time.time() - start
    rate = min(i, total) / elapsed if elapsed > 0 else 1
    eta = (total - min(i, total)) / rate / 60
    print(f"  {min(i,total)}/{total} effects | {len(done_ids)} cards done | ETA {eta:.1f} min", flush=True)
    save()

# Cleanup progress file
if PROGRESS_FILE.exists():
    PROGRESS_FILE.unlink()

print(f"\nDone. {INPUT_FILE}", flush=True)
