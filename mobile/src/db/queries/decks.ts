import { cardsDb, deckDb } from '../init';
import { Deck, DeckCard, Card } from '../../types';

// ── Stats computation (client-side, cross-DB join in JS) ──────────────────────

function computeStats(
  deckCards: DeckCard[],
  cardMap: Map<string, Card>,
): Pick<Deck, 'card_count' | 'colors' | 'type_counts' | 'avg_cost'> {
  let total = 0;
  let cost = 0;
  const colors: Record<string, number> = {};
  const type_counts: Record<string, number> = {};

  for (const dc of deckCards) {
    const card = cardMap.get(dc.card_id);
    if (!card) continue;
    total += dc.count;
    cost  += card.cost * dc.count;
    card.color.forEach(c => { colors[c] = (colors[c] ?? 0) + dc.count; });
    type_counts[card.type] = (type_counts[card.type] ?? 0) + dc.count;
  }

  return {
    card_count: total,
    colors,
    type_counts,
    avg_cost: total > 0 ? Math.round((cost / total) * 10) / 10 : 0,
  };
}

async function fetchCardMap(cardIds: string[]): Promise<Map<string, Card>> {
  if (cardIds.length === 0) return new Map();
  const placeholders = cardIds.map(() => '?').join(',');
  const rows = await cardsDb.getAllAsync<{
    CardID: string; Cost: number; type: string; colors: string | null;
  }>(
    `SELECT c.CardID, c.Cost, ct.Name AS type,
       (SELECT GROUP_CONCAT(col.Name,'|') FROM CardColors cc
        JOIN Colors col ON cc.ColorID=col.ColorID WHERE cc.CardID=c.CardID) AS colors
     FROM Cards c JOIN CardTypes ct ON c.TypeID=ct.TypeID
     WHERE c.CardID IN (${placeholders})`,
    cardIds,
  );
  const map = new Map<string, Card>();
  for (const r of rows) {
    map.set(r.CardID, {
      id: r.CardID, name: '', type: r.type, set: '', cost: r.Cost,
      rarity: '', color: r.colors ? r.colors.split('|') : [],
      subtypes: [], symbols: [], core: [], effects: [], alt_art_ids: [],
    });
  }
  return map;
}

interface DeckRow {
  DeckID: number;
  Name: string;
  Notes: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

interface DeckCardRow { CardID: string; Count: number; }

function rowToDeck(row: DeckRow, cards: DeckCard[], cardMap: Map<string, Card>): Deck {
  return {
    id:         row.DeckID,
    name:       row.Name,
    notes:      row.Notes,
    created_at: row.CreatedAt,
    updated_at: row.UpdatedAt,
    cards,
    ...computeStats(cards, cardMap),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getDecks(): Promise<Deck[]> {
  const deckRows = await deckDb.getAllAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt FROM Decks ORDER BY UpdatedAt DESC',
  );
  if (deckRows.length === 0) return [];

  const allCardRows = await Promise.all(
    deckRows.map(d =>
      deckDb.getAllAsync<DeckCardRow>(
        'SELECT CardID, Count FROM DeckCards WHERE DeckID = ?', [d.DeckID],
      ),
    ),
  );

  const allCardIds = [...new Set(allCardRows.flat().map(r => r.CardID))];
  const cardMap = await fetchCardMap(allCardIds);

  return deckRows.map((d, i) => {
    const cards = allCardRows[i].map(r => ({ card_id: r.CardID, count: r.Count }));
    return rowToDeck(d, cards, cardMap);
  });
}

export async function getDeck(id: number): Promise<Deck & { cards: DeckCard[] }> {
  const row = await deckDb.getFirstAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt FROM Decks WHERE DeckID = ?', [id],
  );
  if (!row) throw new Error(`Deck not found: ${id}`);

  const cardRows = await deckDb.getAllAsync<DeckCardRow>(
    'SELECT CardID, Count FROM DeckCards WHERE DeckID = ?', [id],
  );
  const cards = cardRows.map(r => ({ card_id: r.CardID, count: r.Count }));
  const cardMap = await fetchCardMap(cards.map(c => c.card_id));

  return rowToDeck(row, cards, cardMap) as Deck & { cards: DeckCard[] };
}

export async function createDeck(name: string, notes?: string): Promise<Deck> {
  const result = await deckDb.runAsync(
    'INSERT INTO Decks (Name, Notes) VALUES (?, ?)', [name, notes ?? null],
  );
  const row = await deckDb.getFirstAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt FROM Decks WHERE DeckID = ?',
    [result.lastInsertRowId],
  );
  return rowToDeck(row!, [], new Map());
}

export async function updateDeck(
  id: number,
  data: { name?: string; notes?: string },
): Promise<Deck> {
  await deckDb.runAsync(
    `UPDATE Decks
     SET Name = COALESCE(?, Name), Notes = COALESCE(?, Notes),
         UpdatedAt = CURRENT_TIMESTAMP
     WHERE DeckID = ?`,
    [data.name ?? null, data.notes ?? null, id],
  );
  return getDeck(id);
}

export async function deleteDeck(id: number): Promise<void> {
  await deckDb.runAsync('DELETE FROM Decks WHERE DeckID = ?', [id]);
}

export async function addCardToDeck(
  deckId: number,
  cardId: string,
  count = 1,
): Promise<void> {
  await deckDb.runAsync(
    `INSERT INTO DeckCards (DeckID, CardID, Count) VALUES (?, ?, ?)
     ON CONFLICT(DeckID, CardID) DO UPDATE SET Count = MIN(Count + excluded.Count, 4)`,
    [deckId, cardId, count],
  );
  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}

export async function removeCardFromDeck(deckId: number, cardId: string): Promise<void> {
  await deckDb.runAsync(
    'DELETE FROM DeckCards WHERE DeckID = ? AND CardID = ?', [deckId, cardId],
  );
  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}

export async function updateCardCount(
  deckId: number,
  cardId: string,
  count: number,
): Promise<void> {
  if (count <= 0) {
    await removeCardFromDeck(deckId, cardId);
    return;
  }
  await deckDb.runAsync(
    'UPDATE DeckCards SET Count = ? WHERE DeckID = ? AND CardID = ?',
    [count, deckId, cardId],
  );
  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}
