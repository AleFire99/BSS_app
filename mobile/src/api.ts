import { Card, Deck, DeckCard, KeywordDef, QAItem, CardRuling } from './types';

// Change to your machine's local IP when testing on a physical device
export const API_BASE = 'http://192.168.1.25:8000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export const getCards = (): Promise<Card[]> =>
  req('/api/cards');

export const getCard = (id: string): Promise<Card> =>
  req(`/api/cards/${id}`);

// ── Decks ─────────────────────────────────────────────────────────────────────

export const getDecks = (): Promise<Deck[]> =>
  req('/api/decks');

export const getDeck = (id: number): Promise<Deck & { cards: DeckCard[] }> =>
  req(`/api/decks/${id}`);

export const createDeck = (name: string, notes?: string): Promise<Deck> =>
  req('/api/decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, notes }),
  });

export const updateDeck = (id: number, data: { name?: string; notes?: string }): Promise<Deck> =>
  req(`/api/decks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteDeck = (id: number): Promise<void> =>
  req(`/api/decks/${id}`, { method: 'DELETE' });

export const addCardToDeck = (deckId: number, cardId: string, count = 1): Promise<void> =>
  req(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: cardId, count }),
  });

export const removeCardFromDeck = (deckId: number, cardId: string): Promise<void> =>
  req(`/api/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });

export const updateCardCount = (deckId: number, cardId: string, count: number): Promise<void> =>
  req(`/api/decks/${deckId}/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });

// ── Rulings ───────────────────────────────────────────────────────────────────

export const getKeywords = (): Promise<KeywordDef[]> =>
  req('/api/rulings/keywords');

export const getKeywordDetail = (name: string): Promise<{ name: string; description: string; qa: QAItem[] }> =>
  req(`/api/rulings/keywords/${encodeURIComponent(name)}`);

export const getCardRulings = (): Promise<CardRuling[]> =>
  req('/api/rulings/cards');

export const getCardRulingsById = (cardId: string): Promise<QAItem[]> =>
  req(`/api/rulings/cards/${encodeURIComponent(cardId)}`);
