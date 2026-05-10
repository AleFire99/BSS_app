import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { cardsDb } from '../db/init';
import { createDeck, addCardToDeck } from '../db/queries/decks';

export interface ImportResult {
  deckId: number;
  deckName: string;
  cardCount: number;
  unknownIds: string[];
}

interface ParsedDeck {
  name: string;
  cards: { card_id: string; count: number }[];
}

// ── JSON ──────────────────────────────────────────────────────────────────────

interface DeckJSON {
  version: number;
  name: string;
  exported_at: string;
  cards: { card_id: string; count: number }[];
}

function validateJSON(data: unknown): ParsedDeck {
  if (!data || typeof data !== 'object') throw new Error('Not a valid BSS deck file.');
  const d = data as Record<string, unknown>;
  if (d.version !== 1) throw new Error('Unsupported deck file version.');
  if (typeof d.name !== 'string' || !d.name.trim()) throw new Error('Missing deck name.');
  if (!Array.isArray(d.cards)) throw new Error('Missing cards list.');
  for (const c of d.cards) {
    if (!c || typeof c !== 'object') throw new Error('Invalid card entry in deck file.');
    const entry = c as Record<string, unknown>;
    if (typeof entry.card_id !== 'string') throw new Error('Invalid card_id in deck file.');
    if (typeof entry.count !== 'number' || entry.count < 1) throw new Error('Invalid count in deck file.');
  }
  const json = d as unknown as DeckJSON;
  return { name: json.name.trim(), cards: json.cards };
}

// ── TXT ───────────────────────────────────────────────────────────────────────
// Format:
//   === Deck Name ===
//   4x BSS01-001: Card Name

function parseTXT(content: string, filename: string): ParsedDeck {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  let name = filename.replace(/\.txt$/i, '').replace(/_/g, ' ');
  const cards: { card_id: string; count: number }[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (headerMatch) { name = headerMatch[1]; continue; }
    const cardMatch = line.match(/^(\d+)x\s+([^\s:]+)/);
    if (cardMatch) {
      cards.push({ card_id: cardMatch[2], count: parseInt(cardMatch[1], 10) });
    }
  }

  if (cards.length === 0) throw new Error('No cards found in TXT file.');
  return { name, cards };
}

// ── CSV ───────────────────────────────────────────────────────────────────────
// Format: Count,CardID,Name,Type,Color,Rarity,Cost (header row, then data)

function parseCSV(content: string, filename: string): ParsedDeck {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const name = filename.replace(/\.csv$/i, '').replace(/_/g, ' ');
  const cards: { card_id: string; count: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const count = parseInt(parts[0], 10);
    const cardId = parts[1]?.trim();
    if (!isNaN(count) && count > 0 && cardId) {
      cards.push({ card_id: cardId, count });
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

  // Validate card IDs against local cards.db
  const allIds = parsed.cards.map(c => c.card_id);
  const placeholders = allIds.map(() => '?').join(',');
  const rows = await cardsDb.getAllAsync<{ CardID: string }>(
    `SELECT CardID FROM Cards WHERE CardID IN (${placeholders})`,
    allIds,
  );
  const knownSet = new Set(rows.map(r => r.CardID));
  const unknownIds = allIds.filter(id => !knownSet.has(id));
  const validCards = parsed.cards.filter(c => knownSet.has(c.card_id));

  const deck = await createDeck(parsed.name);
  let cardCount = 0;
  for (const c of validCards) {
    await addCardToDeck(deck.id, c.card_id, Math.min(c.count, 4));
    cardCount += Math.min(c.count, 4);
  }

  return { deckId: deck.id, deckName: deck.name, cardCount, unknownIds };
}
