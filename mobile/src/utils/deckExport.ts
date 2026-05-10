import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Deck, DeckCard, Card } from '../types';

export function buildTXT(
  deck: Deck & { cards: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const sorted = [...deck.cards].sort((a, b) => a.card_id.localeCompare(b.card_id));
  const lines = [`=== ${deck.name} ===`];
  for (const dc of sorted) {
    const name = cardMap[dc.card_id]?.name ?? dc.card_id;
    lines.push(`${dc.count}x ${dc.card_id}: ${name}`);
  }
  return lines.join('\n');
}

export function buildCSV(
  deck: Deck & { cards: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const rows: string[] = ['Count,CardID,Name,Type,Color,Rarity,Cost'];

  const sorted = [...deck.cards].sort((a, b) => a.card_id.localeCompare(b.card_id));

  for (const dc of sorted) {
    const card = cardMap[dc.card_id];
    const name = card ? `"${card.name.replace(/"/g, '""')}"` : `"${dc.card_id}"`;
    const type = card?.type ?? '';
    const color = card?.color.join('/') ?? '';
    const rarity = card?.rarity ?? '';
    const cost = card?.cost ?? '';
    rows.push(`${dc.count},${dc.card_id},${name},${type},${color},${rarity},${cost}`);
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
