import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { cardsDb } from '../db/init';
import { createDeck, addCardToDeck } from '../db/queries/decks';

export interface ImportResult {
  deckId: number;
  deckName: string;
  cardCount: number;
  sideboardCount: number;
  unknownIds: string[];
}

interface ParsedCard {
  card_id: string;
  count: number;
  section: 'main' | 'sideboard';
}

interface ParsedDeck {
  name: string;
  cards: ParsedCard[];
}

// ── JSON ──────────────────────────────────────────────────────────────────────

interface DeckJSONv1 {
  version: 1;
  name: string;
  exported_at: string;
  cards: { card_id: string; count: number }[];
}

interface DeckJSONv2 {
  version: 2;
  name: string;
  exported_at: string;
  cards: { card_id: string; count: number }[];
  sideboard: { card_id: string; count: number }[];
}

function validateJSON(data: unknown): ParsedDeck {
  if (!data || typeof data !== 'object') throw new Error('Not a valid BSS deck file.');
  const d = data as Record<string, unknown>;
  if (d.version !== 1 && d.version !== 2) throw new Error('Unsupported deck file version.');
  if (typeof d.name !== 'string' || !d.name.trim()) throw new Error('Missing deck name.');
  if (!Array.isArray(d.cards)) throw new Error('Missing cards list.');
  for (const c of d.cards) {
    if (!c || typeof c !== 'object') throw new Error('Invalid card entry in deck file.');
    const entry = c as Record<string, unknown>;
    if (typeof entry.card_id !== 'string') throw new Error('Invalid card_id in deck file.');
    if (typeof entry.count !== 'number' || entry.count < 1) throw new Error('Invalid count in deck file.');
  }

  const cards: ParsedCard[] = (d.cards as { card_id: string; count: number }[]).map(c => ({
    card_id: c.card_id,
    count: c.count,
    section: 'main' as const,
  }));

  if (d.version === 2 && Array.isArray(d.sideboard)) {
    for (const c of d.sideboard as { card_id: string; count: number }[]) {
      cards.push({ card_id: c.card_id, count: c.count, section: 'sideboard' });
    }
  }

  return { name: (d.name as string).trim(), cards };
}

// ── TXT ───────────────────────────────────────────────────────────────────────
// Format:
//   === Deck Name ===
//   4x BSS01-001: Card Name
//   (optional)
//   === Sideboard ===
//   2x BSS01-005: Card Name

function parseTXT(content: string, filename: string): ParsedDeck {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  let name = filename.replace(/\.txt$/i, '').replace(/_/g, ' ');
  const cards: ParsedCard[] = [];
  let currentSection: 'main' | 'sideboard' = 'main';

  for (const line of lines) {
    const headerMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (headerMatch) {
      const hdr = headerMatch[1].toLowerCase();
      if (hdr === 'sideboard') {
        currentSection = 'sideboard';
      } else if (hdr === 'main') {
        currentSection = 'main';
      } else {
        name = headerMatch[1];
        currentSection = 'main';
      }
      continue;
    }
    const cardMatch = line.match(/^(\d+)x\s+([^\s:]+)/);
    if (cardMatch) {
      cards.push({
        card_id: cardMatch[2],
        count: parseInt(cardMatch[1], 10),
        section: currentSection,
      });
    }
  }

  if (cards.length === 0) throw new Error('No cards found in TXT file.');
  return { name, cards };
}

// ── CSV ───────────────────────────────────────────────────────────────────────
// Format: Count,CardID,Name,Type,Color,Rarity,Cost[,Section]

function parseCSV(content: string, filename: string): ParsedDeck {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const name = filename.replace(/\.csv$/i, '').replace(/_/g, ' ');
  const cards: ParsedCard[] = [];

  // Detect Section column index from header
  const header = lines[0]?.split(',').map(h => h.trim().toLowerCase()) ?? [];
  const sectionIdx = header.indexOf('section');

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const count = parseInt(parts[0], 10);
    const cardId = parts[1]?.trim();
    if (!isNaN(count) && count > 0 && cardId) {
      const rawSection = sectionIdx >= 0 ? (parts[sectionIdx]?.trim() ?? 'main') : 'main';
      const section: 'main' | 'sideboard' = rawSection === 'sideboard' ? 'sideboard' : 'main';
      cards.push({ card_id: cardId, count, section });
    }
  }

  if (cards.length === 0) throw new Error('No cards found in CSV file.');
  return { name, cards };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function pickAndImportDeck(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'text/csv', 'text/comma-separated-values'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  const ext = asset.name.split('.').pop()?.toLowerCase() ?? '';

  let content: string;
  try {
    content = await FileSystem.readAsStringAsync(asset.uri);
  } catch {
    throw new Error('Could not read the selected file.');
  }
  FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});

  let parsed: ParsedDeck;
  try {
    if (ext === 'json') {
      parsed = validateJSON(JSON.parse(content));
    } else if (ext === 'txt') {
      parsed = parseTXT(content, asset.name);
    } else if (ext === 'csv') {
      parsed = parseCSV(content, asset.name);
    } else {
      throw new Error('Unsupported file type. Use .json, .txt, or .csv.');
    }
  } catch (e: any) {
    throw new Error(e.message ?? 'Could not parse deck file.');
  }

  // Validate card IDs
  const allIds = [...new Set(parsed.cards.map(c => c.card_id))];
  const placeholders = allIds.map(() => '?').join(',');
  const rows = await cardsDb.getAllAsync<{ CardID: string }>(
    `SELECT CardID FROM Cards WHERE CardID IN (${placeholders})`,
    allIds,
  );
  const knownSet = new Set(rows.map(r => r.CardID));
  const unknownIds = allIds.filter(id => !knownSet.has(id));
  const validCards = parsed.cards.filter(c => knownSet.has(c.card_id));

  // Enforce per-section limits during import
  // Track combined copy count per card across sections
  const copyCount: Record<string, number> = {};
  const sideboardTotal: { count: number } = { count: 0 };
  const finalCards: ParsedCard[] = [];

  for (const c of validCards) {
    const current = copyCount[c.card_id] ?? 0;
    const canAdd = Math.max(0, 4 - current);
    if (canAdd === 0) continue;

    let addCount = Math.min(c.count, canAdd);

    if (c.section === 'sideboard') {
      const sbSlots = Math.max(0, 10 - sideboardTotal.count);
      addCount = Math.min(addCount, sbSlots);
      if (addCount <= 0) continue;
      sideboardTotal.count += addCount;
    }

    copyCount[c.card_id] = current + addCount;
    finalCards.push({ ...c, count: addCount });
  }

  const deck = await createDeck(parsed.name);
  let cardCount = 0;
  let sideboardCount = 0;

  for (const c of finalCards) {
    await addCardToDeck(deck.id, c.card_id, c.count, c.section);
    if (c.section === 'sideboard') sideboardCount += c.count;
    else cardCount += c.count;
  }

  return { deckId: deck.id, deckName: deck.name, cardCount, sideboardCount, unknownIds };
}
