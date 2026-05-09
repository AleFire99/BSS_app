import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Deck, DeckCard, Card } from '../types';

const TYPE_ORDER = ['SPIRIT', 'NEXUS', 'MAGIC'];

export function buildJSON(deck: Deck & { cards: DeckCard[] }): string {
  return JSON.stringify(
    {
      version: 1,
      name: deck.name,
      exported_at: new Date().toISOString(),
      cards: deck.cards.map(c => ({ card_id: c.card_id, count: c.count })),
    },
    null,
    2,
  );
}

export function buildTXT(
  deck: Deck & { cards: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString();

  lines.push(`Deck: ${deck.name}`);
  lines.push(`Exported: ${date}`);
  lines.push(`Cards: ${deck.card_count} | Avg Cost: ${deck.avg_cost.toFixed(1)}`);
  lines.push('');

  for (const type of TYPE_ORDER) {
    const group = deck.cards
      .filter(c => cardMap[c.card_id]?.type === type)
      .sort((a, b) => {
        const ca = cardMap[a.card_id];
        const cb = cardMap[b.card_id];
        return (ca?.cost ?? 0) - (cb?.cost ?? 0) || (ca?.name ?? '').localeCompare(cb?.name ?? '');
      });

    if (group.length === 0) continue;

    const total = group.reduce((s, c) => s + c.count, 0);
    lines.push(`--- ${type} (${total}) ---`);

    for (const dc of group) {
      const card = cardMap[dc.card_id];
      if (!card) {
        lines.push(`${dc.count}x [${dc.card_id}] (unknown card)`);
      } else {
        const colors = card.color.join('/');
        lines.push(`${dc.count}x ${card.name} [${card.id}] Cost:${card.cost} ${colors} ${card.rarity}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function buildCSV(
  deck: Deck & { cards: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const rows: string[] = ['CardID,Name,Count,Type,Cost,Color,Rarity'];

  const sorted = [...deck.cards].sort((a, b) => {
    const ca = cardMap[a.card_id];
    const cb = cardMap[b.card_id];
    const typeA = TYPE_ORDER.indexOf(ca?.type ?? '');
    const typeB = TYPE_ORDER.indexOf(cb?.type ?? '');
    if (typeA !== typeB) return typeA - typeB;
    return a.card_id.localeCompare(b.card_id);
  });

  for (const dc of sorted) {
    const card = cardMap[dc.card_id];
    const name = card ? `"${card.name.replace(/"/g, '""')}"` : `"${dc.card_id}"`;
    const type = card?.type ?? '';
    const cost = card?.cost ?? '';
    const color = card?.color.join('/') ?? '';
    const rarity = card?.rarity ?? '';
    rows.push(`${dc.card_id},${name},${dc.count},${type},${cost},${color},${rarity}`);
  }

  return rows.join('\n');
}

export async function shareTextExport(
  content: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
}

export async function canShareFiles(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}
