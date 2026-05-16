import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Deck, DeckCard, Card } from '../types';

export function buildTXT(
  deck: Deck & { cards: DeckCard[]; sideboard?: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const sortedMain = [...deck.cards].sort((a, b) => a.card_id.localeCompare(b.card_id));
  const lines = [`=== ${deck.name} ===`];
  lines.push('');
  lines.push('=== Main ===');
  for (const dc of sortedMain) {
    const name = cardMap[dc.card_id]?.name ?? dc.card_id;
    lines.push(`${dc.count}x ${dc.card_id}: ${name}`);
  }

  const sideboard = deck.sideboard ?? [];
  if (sideboard.length > 0) {
    lines.push('');
    lines.push('=== Sideboard ===');
    const sortedSide = [...sideboard].sort((a, b) => a.card_id.localeCompare(b.card_id));
    for (const dc of sortedSide) {
      const name = cardMap[dc.card_id]?.name ?? dc.card_id;
      lines.push(`${dc.count}x ${dc.card_id}: ${name}`);
    }
  }

  return lines.join('\n');
}

export function buildCSV(
  deck: Deck & { cards: DeckCard[]; sideboard?: DeckCard[] },
  cardMap: Record<string, Card>,
): string {
  const rows: string[] = ['Count,CardID,Name,Type,Color,Rarity,Cost,Section'];

  const allCards: DeckCard[] = [
    ...deck.cards,
    ...(deck.sideboard ?? []),
  ].sort((a, b) => {
    if (a.section !== b.section) return a.section === 'main' ? -1 : 1;
    return a.card_id.localeCompare(b.card_id);
  });

  for (const dc of allCards) {
    const card = cardMap[dc.card_id];
    const name = card ? `"${card.name.replace(/"/g, '""')}"` : `"${dc.card_id}"`;
    const type = card?.type ?? '';
    const color = card?.color.join('/') ?? '';
    const rarity = card?.rarity ?? '';
    const cost = card?.cost ?? '';
    const section = dc.section ?? 'main';
    rows.push(`${dc.count},${dc.card_id},${name},${type},${color},${rarity},${cost},${section}`);
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

export async function saveTextToDevice(
  content: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) return;
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    result.directoryUri, filename, mimeType,
  );
  await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, content);
}
