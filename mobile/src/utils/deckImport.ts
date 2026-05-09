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

interface DeckJSON {
  version: number;
  name: string;
  exported_at: string;
  cards: { card_id: string; count: number }[];
}

function validateShape(data: unknown): DeckJSON {
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
  return d as unknown as DeckJSON;
}

export async function pickAndImportDeck(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  let content: string;
  try {
    content = await FileSystem.readAsStringAsync(asset.uri);
  } catch {
    throw new Error('Could not read the selected file.');
  }

  let json: DeckJSON;
  try {
    json = validateShape(JSON.parse(content));
  } catch (e: any) {
    throw new Error(e.message ?? 'Not a valid BSS deck file.');
  } finally {
    FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
  }

  // Validate card IDs against local cards.db
  const allIds = json.cards.map(c => c.card_id);
  const placeholders = allIds.map(() => '?').join(',');
  const rows = await cardsDb.getAllAsync<{ CardID: string }>(
    `SELECT CardID FROM Cards WHERE CardID IN (${placeholders})`,
    allIds,
  );
  const knownSet = new Set(rows.map(r => r.CardID));
  const unknownIds = allIds.filter(id => !knownSet.has(id));
  const validCards = json.cards.filter(c => knownSet.has(c.card_id));

  const deck = await createDeck(json.name.trim());
  let cardCount = 0;
  for (const c of validCards) {
    await addCardToDeck(deck.id, c.card_id, Math.min(c.count, 4));
    cardCount += Math.min(c.count, 4);
  }

  return { deckId: deck.id, deckName: deck.name, cardCount, unknownIds };
}
