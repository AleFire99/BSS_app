import { cardsDb, deckDb } from '../init';
import { Deck, DeckCard, Card } from '../../types';

// ── Stats computation (client-side, cross-DB join in JS) ──────────────────────

function computeStats(
  mainCards: DeckCard[],
  cardMap: Map<string, Card>,
): Pick<Deck, 'card_count' | 'colors' | 'type_counts' | 'avg_cost'> {
  let total = 0;
  let cost = 0;
  const colors: Record<string, number> = {};
  const type_counts: Record<string, number> = {};

  for (const dc of mainCards) {
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
  Position: number;
}

interface DeckCardRow { CardID: string; Count: number; Section: 'main' | 'sideboard'; }

function splitCards(rows: DeckCardRow[]): { main: DeckCard[]; side: DeckCard[] } {
  const main: DeckCard[] = [];
  const side: DeckCard[] = [];
  for (const r of rows) {
    const dc: DeckCard = { card_id: r.CardID, count: r.Count, section: r.Section };
    if (r.Section === 'sideboard') side.push(dc);
    else main.push(dc);
  }
  return { main, side };
}

function rowToDeck(
  row: DeckRow,
  main: DeckCard[],
  side: DeckCard[],
  cardMap: Map<string, Card>,
): Deck {
  return {
    id:             row.DeckID,
    name:           row.Name,
    notes:          row.Notes,
    created_at:     row.CreatedAt,
    updated_at:     row.UpdatedAt,
    position:       row.Position ?? 0,
    cards:          main,
    sideboard:      side,
    sideboard_count: side.reduce((s, dc) => s + dc.count, 0),
    ...computeStats(main, cardMap),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getDecks(): Promise<Deck[]> {
  const deckRows = await deckDb.getAllAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt, Position FROM Decks ORDER BY Position ASC',
  );
  if (deckRows.length === 0) return [];

  const allCardRows = await Promise.all(
    deckRows.map(d =>
      deckDb.getAllAsync<DeckCardRow>(
        'SELECT CardID, Count, Section FROM DeckCards WHERE DeckID = ?', [d.DeckID],
      ),
    ),
  );

  const allCardIds = [...new Set(allCardRows.flat().map(r => r.CardID))];
  const cardMap = await fetchCardMap(allCardIds);

  return deckRows.map((d, i) => {
    const { main, side } = splitCards(allCardRows[i]);
    return rowToDeck(d, main, side, cardMap);
  });
}

export async function getDeck(id: number): Promise<Deck & { cards: DeckCard[]; sideboard: DeckCard[] }> {
  const row = await deckDb.getFirstAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt, Position FROM Decks WHERE DeckID = ?', [id],
  );
  if (!row) throw new Error(`Deck not found: ${id}`);

  const cardRows = await deckDb.getAllAsync<DeckCardRow>(
    'SELECT CardID, Count, Section FROM DeckCards WHERE DeckID = ?', [id],
  );
  const { main, side } = splitCards(cardRows);
  const allIds = cardRows.map(r => r.CardID);
  const cardMap = await fetchCardMap(allIds);

  return rowToDeck(row, main, side, cardMap) as Deck & { cards: DeckCard[]; sideboard: DeckCard[] };
}

export async function createDeck(name: string, notes?: string): Promise<Deck> {
  const posRow = await deckDb.getFirstAsync<{ maxPos: number }>(
    'SELECT COALESCE(MAX(Position), 0) + 1 AS maxPos FROM Decks',
  );
  const pos = posRow?.maxPos ?? 0;
  const result = await deckDb.runAsync(
    'INSERT INTO Decks (Name, Notes, Position) VALUES (?, ?, ?)', [name, notes ?? null, pos],
  );
  const row = await deckDb.getFirstAsync<DeckRow>(
    'SELECT DeckID, Name, Notes, CreatedAt, UpdatedAt, Position FROM Decks WHERE DeckID = ?',
    [result.lastInsertRowId],
  );
  return rowToDeck(row!, [], [], new Map());
}

export async function reorderDecks(ids: number[]): Promise<void> {
  await deckDb.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await deckDb.runAsync('UPDATE Decks SET Position = ? WHERE DeckID = ?', [i, ids[i]]);
    }
  });
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
  section: 'main' | 'sideboard' = 'main',
): Promise<void> {
  // Enforce 4-copy limit across both sections
  const existing = await deckDb.getFirstAsync<{ total: number }>(
    'SELECT SUM(Count) AS total FROM DeckCards WHERE DeckID = ? AND CardID = ?',
    [deckId, cardId],
  );
  const currentTotal = existing?.total ?? 0;
  const canAdd = Math.max(0, 4 - currentTotal);
  if (canAdd === 0) return;
  const addCount = Math.min(count, canAdd);

  // Enforce sideboard 10-card cap
  if (section === 'sideboard') {
    const sbRow = await deckDb.getFirstAsync<{ total: number }>(
      `SELECT SUM(Count) AS total FROM DeckCards WHERE DeckID = ? AND Section = 'sideboard'`,
      [deckId],
    );
    const sbTotal = sbRow?.total ?? 0;
    const sbSlots = Math.max(0, 10 - sbTotal);
    if (sbSlots === 0) return;
    const finalCount = Math.min(addCount, sbSlots);
    if (finalCount <= 0) return;

    await deckDb.runAsync(
      `INSERT INTO DeckCards (DeckID, CardID, Count, Section) VALUES (?, ?, ?, ?)
       ON CONFLICT(DeckID, CardID, Section) DO UPDATE SET Count = Count + ?`,
      [deckId, cardId, finalCount, section, finalCount],
    );
  } else {
    await deckDb.runAsync(
      `INSERT INTO DeckCards (DeckID, CardID, Count, Section) VALUES (?, ?, ?, ?)
       ON CONFLICT(DeckID, CardID, Section) DO UPDATE SET Count = Count + ?`,
      [deckId, cardId, addCount, section, addCount],
    );
  }

  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}

export async function removeCardFromDeck(
  deckId: number,
  cardId: string,
  section: 'main' | 'sideboard' = 'main',
): Promise<void> {
  await deckDb.runAsync(
    'DELETE FROM DeckCards WHERE DeckID = ? AND CardID = ? AND Section = ?',
    [deckId, cardId, section],
  );
  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}

export async function updateCardCount(
  deckId: number,
  cardId: string,
  count: number,
  section: 'main' | 'sideboard' = 'main',
): Promise<void> {
  if (count <= 0) {
    await removeCardFromDeck(deckId, cardId, section);
    return;
  }
  await deckDb.runAsync(
    'UPDATE DeckCards SET Count = ? WHERE DeckID = ? AND CardID = ? AND Section = ?',
    [count, deckId, cardId, section],
  );
  await deckDb.runAsync(
    'UPDATE Decks SET UpdatedAt = CURRENT_TIMESTAMP WHERE DeckID = ?', [deckId],
  );
}
