import { deckDb } from '../init';
import { Banlist, BanlistChange, BanlistEntry, BanlistViolation, Card, DeckCard } from '../../types';

import OFFICIAL_JSON from '../../../assets/banlists.json';

export const DEFAULT_COPY_LIMIT = 4;
export const FORMAT_LATEST = 'official:latest';
export const FORMAT_NONE   = 'none';

export const LIMIT_LABEL: Record<number, string> = {
  0: 'Forbidden',
  1: 'Limited 1',
  2: 'Limited 2',
  3: 'Limited 3',
};

// ── Official lists (bundled JSON, newest first) ───────────────────────────────

interface OfficialJson {
  id: string;
  name: string;
  effective: string;
  source?: string;
  complete?: boolean;
  entries: BanlistEntry[];
}

const OFFICIAL: Banlist[] = (OFFICIAL_JSON as OfficialJson[])
  .map(b => ({
    key:       `official:${b.id}`,
    kind:      'official' as const,
    name:      b.name,
    effective: b.effective,
    source:    b.source,
    complete:  b.complete,
    entries:   b.entries,
  }))
  .sort((a, b) => (b.effective ?? '').localeCompare(a.effective ?? ''));

export function getOfficialBanlists(): Banlist[] {
  return OFFICIAL;
}

export function getLatestOfficial(): Banlist | null {
  return OFFICIAL[0] ?? null;
}

/** Changes of an official list vs the one before it (null if it is the first). */
export function getBanlistDiff(key: string): BanlistChange[] | null {
  const idx = OFFICIAL.findIndex(b => b.key === key);
  if (idx < 0 || idx === OFFICIAL.length - 1) return null;
  return diffEntries(OFFICIAL[idx + 1].entries, OFFICIAL[idx].entries);
}

function diffEntries(prev: BanlistEntry[], next: BanlistEntry[]): BanlistChange[] {
  const before = new Map(prev.map(e => [e.card_name, e]));
  const after  = new Map(next.map(e => [e.card_name, e]));
  const changes: BanlistChange[] = [];
  for (const [name, e] of after) {
    const old = before.get(name);
    if (!old || old.limit !== e.limit) {
      changes.push({ card_name: name, card_id: e.card_id, from: old?.limit ?? null, to: e.limit });
    }
  }
  for (const [name, e] of before) {
    if (!after.has(name)) changes.push({ card_name: name, card_id: e.card_id, from: e.limit, to: null });
  }
  return changes;
}

// ── Custom lists (deck.db) ────────────────────────────────────────────────────

interface CustomRow { BanlistID: number; Name: string; BasedOn: string | null; }
interface EntryRow  { CardName: string; CardID: string | null; CopyLimit: number; }

async function loadCustom(row: CustomRow): Promise<Banlist> {
  const entries = await deckDb.getAllAsync<EntryRow>(
    'SELECT CardName, CardID, CopyLimit FROM CustomBanlistEntries WHERE BanlistID = ? ORDER BY CopyLimit, CardName',
    [row.BanlistID],
  );
  return {
    key:     `custom:${row.BanlistID}`,
    kind:    'custom',
    name:    row.Name,
    entries: entries.map(e => ({ card_name: e.CardName, card_id: e.CardID ?? undefined, limit: e.CopyLimit })),
  };
}

export async function getCustomBanlists(): Promise<Banlist[]> {
  const rows = await deckDb.getAllAsync<CustomRow>(
    'SELECT BanlistID, Name, BasedOn FROM CustomBanlists ORDER BY UpdatedAt DESC',
  );
  return Promise.all(rows.map(loadCustom));
}

export async function getCustomBanlist(id: number): Promise<Banlist | null> {
  const row = await deckDb.getFirstAsync<CustomRow>(
    'SELECT BanlistID, Name, BasedOn FROM CustomBanlists WHERE BanlistID = ?', [id],
  );
  return row ? loadCustom(row) : null;
}

/** Creates a custom list. `basedOn` is a banlist key whose entries are copied. */
export async function createCustomBanlist(name: string, basedOn?: string): Promise<Banlist> {
  const source = basedOn ? await getBanlist(basedOn) : null;
  let newId = 0;
  await deckDb.withTransactionAsync(async () => {
    const res = await deckDb.runAsync(
      'INSERT INTO CustomBanlists (Name, BasedOn) VALUES (?, ?)', [name, basedOn ?? null],
    );
    newId = res.lastInsertRowId;
    for (const e of source?.entries ?? []) {
      await deckDb.runAsync(
        'INSERT INTO CustomBanlistEntries (BanlistID, CardName, CardID, CopyLimit) VALUES (?, ?, ?, ?)',
        [newId, e.card_name, e.card_id ?? null, e.limit],
      );
    }
  });
  return (await getCustomBanlist(newId))!;
}

export async function renameCustomBanlist(id: number, name: string): Promise<void> {
  await deckDb.runAsync(
    'UPDATE CustomBanlists SET Name = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE BanlistID = ?', [name, id],
  );
}

export async function deleteCustomBanlist(id: number): Promise<void> {
  await deckDb.withTransactionAsync(async () => {
    await deckDb.runAsync('DELETE FROM CustomBanlists WHERE BanlistID = ?', [id]);
    await deckDb.runAsync('UPDATE Decks SET Format = ? WHERE Format = ?', [FORMAT_LATEST, `custom:${id}`]);
  });
}

export async function setBanlistEntry(id: number, card: { name: string; id?: string }, limit: number): Promise<void> {
  await deckDb.runAsync(
    `INSERT INTO CustomBanlistEntries (BanlistID, CardName, CardID, CopyLimit) VALUES (?, ?, ?, ?)
     ON CONFLICT(BanlistID, CardName) DO UPDATE SET CopyLimit = excluded.CopyLimit`,
    [id, card.name, card.id ?? null, limit],
  );
  await deckDb.runAsync('UPDATE CustomBanlists SET UpdatedAt = CURRENT_TIMESTAMP WHERE BanlistID = ?', [id]);
}

export async function removeBanlistEntry(id: number, cardName: string): Promise<void> {
  await deckDb.runAsync(
    'DELETE FROM CustomBanlistEntries WHERE BanlistID = ? AND CardName = ?', [id, cardName],
  );
  await deckDb.runAsync('UPDATE CustomBanlists SET UpdatedAt = CURRENT_TIMESTAMP WHERE BanlistID = ?', [id]);
}

// ── Formats ───────────────────────────────────────────────────────────────────

/** Resolves a deck format / banlist key to a list. Unknown keys fall back to latest official. */
export async function getBanlist(format: string): Promise<Banlist | null> {
  if (format === FORMAT_NONE) return null;
  if (format.startsWith('custom:')) {
    const custom = await getCustomBanlist(Number(format.slice('custom:'.length)));
    if (custom) return custom;
  }
  return OFFICIAL.find(b => b.key === format) ?? getLatestOfficial();
}

export function formatLabel(format: string, customs: Banlist[] = []): string {
  if (format === FORMAT_NONE) return 'No banlist';
  if (format === FORMAT_LATEST) return `Official (latest)`;
  const found = [...OFFICIAL, ...customs].find(b => b.key === format);
  return found?.name ?? 'Official (latest)';
}

export function banlistLimits(list: Banlist | null): Map<string, number> {
  return new Map((list?.entries ?? []).map(e => [e.card_name, e.limit]));
}

export function getCardLimit(cardName: string | undefined, limits: Map<string, number>): number {
  if (!cardName) return DEFAULT_COPY_LIMIT;
  return Math.min(DEFAULT_COPY_LIMIT, limits.get(cardName) ?? DEFAULT_COPY_LIMIT);
}

/** Cards over their limit. Copies are counted by name across main deck and sideboard. */
export function getDeckViolations(
  cards: DeckCard[],
  cardName: (cardId: string) => string | undefined,
  limits: Map<string, number>,
): BanlistViolation[] {
  if (limits.size === 0) return [];
  const counts = new Map<string, number>();
  for (const dc of cards) {
    const name = cardName(dc.card_id);
    if (name) counts.set(name, (counts.get(name) ?? 0) + dc.count);
  }
  const out: BanlistViolation[] = [];
  for (const [name, count] of counts) {
    const limit = getCardLimit(name, limits);
    if (count > limit) out.push({ card_name: name, count, limit });
  }
  return out;
}

export function getListLimit(card: Card, list: Banlist | null): number | null {
  const e = list?.entries.find(x => x.card_name === card.name);
  return e ? e.limit : null;
}
