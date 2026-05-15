import { cardsDb, deckDb } from '../init';
import { SwapPlan, SwapPlanCard, Card } from '../../types';

interface SwapPlanRow {
  PlanID: number;
  DeckID: number;
  Name: string;
  Notes: string | null;
}

interface SwapPlanCardRow {
  CardID: string;
  Direction: 'out' | 'in';
  Count: number;
}

async function hydrateCards(rows: SwapPlanCardRow[]): Promise<SwapPlanCard[]> {
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map(r => r.CardID))];
  const placeholders = ids.map(() => '?').join(',');
  const cardRows = await cardsDb.getAllAsync<{
    CardID: string; Name: string; Cost: number; type: string; colors: string | null; Rarity: string;
  }>(
    `SELECT c.CardID, c.Name, c.Cost, c.Rarity, ct.Name AS type,
       (SELECT GROUP_CONCAT(col.Name,'|') FROM CardColors cc
        JOIN Colors col ON cc.ColorID=col.ColorID WHERE cc.CardID=c.CardID) AS colors
     FROM Cards c JOIN CardTypes ct ON c.TypeID=ct.TypeID
     WHERE c.CardID IN (${placeholders})`,
    ids,
  );
  const cardMap = new Map<string, Card>();
  for (const r of cardRows) {
    cardMap.set(r.CardID, {
      id: r.CardID, name: r.Name, type: r.type, set: '', cost: r.Cost,
      rarity: r.Rarity, color: r.colors ? r.colors.split('|') : [],
      subtypes: [], symbols: [], core: [], effects: [], alt_art_ids: [],
    });
  }
  return rows.map(r => ({
    card_id: r.CardID,
    direction: r.Direction,
    count: r.Count,
    card: cardMap.get(r.CardID),
  }));
}

function rowToPlan(row: SwapPlanRow, cards: SwapPlanCard[]): SwapPlan {
  return {
    id: row.PlanID,
    deck_id: row.DeckID,
    name: row.Name,
    notes: row.Notes,
    cards,
  };
}

export async function getSwapPlans(deckId: number): Promise<SwapPlan[]> {
  const planRows = await deckDb.getAllAsync<SwapPlanRow>(
    'SELECT PlanID, DeckID, Name, Notes FROM SwapPlans WHERE DeckID = ? ORDER BY PlanID ASC',
    [deckId],
  );
  if (planRows.length === 0) return [];

  const allCardRows = await Promise.all(
    planRows.map(p =>
      deckDb.getAllAsync<SwapPlanCardRow>(
        'SELECT CardID, Direction, Count FROM SwapPlanCards WHERE PlanID = ?', [p.PlanID],
      ),
    ),
  );

  const allIds = [...new Set(allCardRows.flat().map(r => r.CardID))];
  const cardRows = allIds.length > 0
    ? await cardsDb.getAllAsync<{ CardID: string; Name: string; Cost: number; type: string; colors: string | null; Rarity: string }>(
        `SELECT c.CardID, c.Name, c.Cost, c.Rarity, ct.Name AS type,
           (SELECT GROUP_CONCAT(col.Name,'|') FROM CardColors cc
            JOIN Colors col ON cc.ColorID=col.ColorID WHERE cc.CardID=c.CardID) AS colors
         FROM Cards c JOIN CardTypes ct ON c.TypeID=ct.TypeID
         WHERE c.CardID IN (${allIds.map(() => '?').join(',')})`,
        allIds,
      )
    : [];

  const cardMap = new Map<string, Card>();
  for (const r of cardRows) {
    cardMap.set(r.CardID, {
      id: r.CardID, name: r.Name, type: r.type, set: '', cost: r.Cost,
      rarity: r.Rarity, color: r.colors ? r.colors.split('|') : [],
      subtypes: [], symbols: [], core: [], effects: [], alt_art_ids: [],
    });
  }

  return planRows.map((p, i) => {
    const spc: SwapPlanCard[] = allCardRows[i].map(r => ({
      card_id: r.CardID,
      direction: r.Direction,
      count: r.Count,
      card: cardMap.get(r.CardID),
    }));
    return rowToPlan(p, spc);
  });
}

export async function getSwapPlan(planId: number): Promise<SwapPlan> {
  const row = await deckDb.getFirstAsync<SwapPlanRow>(
    'SELECT PlanID, DeckID, Name, Notes FROM SwapPlans WHERE PlanID = ?', [planId],
  );
  if (!row) throw new Error(`Swap plan not found: ${planId}`);
  const cardRows = await deckDb.getAllAsync<SwapPlanCardRow>(
    'SELECT CardID, Direction, Count FROM SwapPlanCards WHERE PlanID = ?', [planId],
  );
  const cards = await hydrateCards(cardRows);
  return rowToPlan(row, cards);
}

export async function createSwapPlan(
  deckId: number,
  name: string,
  notes?: string,
): Promise<SwapPlan> {
  const result = await deckDb.runAsync(
    'INSERT INTO SwapPlans (DeckID, Name, Notes) VALUES (?, ?, ?)',
    [deckId, name, notes ?? null],
  );
  const row = await deckDb.getFirstAsync<SwapPlanRow>(
    'SELECT PlanID, DeckID, Name, Notes FROM SwapPlans WHERE PlanID = ?',
    [result.lastInsertRowId],
  );
  return rowToPlan(row!, []);
}

export async function updateSwapPlan(
  planId: number,
  data: { name?: string; notes?: string },
): Promise<SwapPlan> {
  await deckDb.runAsync(
    `UPDATE SwapPlans SET Name = COALESCE(?, Name), Notes = COALESCE(?, Notes) WHERE PlanID = ?`,
    [data.name ?? null, data.notes ?? null, planId],
  );
  return getSwapPlan(planId);
}

export async function deleteSwapPlan(planId: number): Promise<void> {
  await deckDb.runAsync('DELETE FROM SwapPlans WHERE PlanID = ?', [planId]);
}

export async function addCardToSwapPlan(
  planId: number,
  cardId: string,
  direction: 'out' | 'in',
  count: number,
): Promise<void> {
  await deckDb.runAsync(
    `INSERT INTO SwapPlanCards (PlanID, CardID, Direction, Count) VALUES (?, ?, ?, ?)
     ON CONFLICT(PlanID, CardID, Direction) DO UPDATE SET Count = ?`,
    [planId, cardId, direction, count, count],
  );
}

export async function removeCardFromSwapPlan(
  planId: number,
  cardId: string,
  direction: 'out' | 'in',
): Promise<void> {
  await deckDb.runAsync(
    'DELETE FROM SwapPlanCards WHERE PlanID = ? AND CardID = ? AND Direction = ?',
    [planId, cardId, direction],
  );
}

export async function updateSwapPlanCardCount(
  planId: number,
  cardId: string,
  direction: 'out' | 'in',
  count: number,
): Promise<void> {
  if (count <= 0) {
    await removeCardFromSwapPlan(planId, cardId, direction);
    return;
  }
  await deckDb.runAsync(
    'UPDATE SwapPlanCards SET Count = ? WHERE PlanID = ? AND CardID = ? AND Direction = ?',
    [count, planId, cardId, direction],
  );
}
