export interface CoreLevel {
  lv: number;
  bp: number;
  cores: number;
}

export interface Keyword {
  name: string;
  modifier: string | number | null;
}

export interface Effect {
  condition: string | null;
  details: string | null;
  levels: number[];
  keywords: Keyword[];
  steps: string[];
}

export interface Card {
  id: string;
  name: string;
  type: string;
  set: string;
  cost: number;
  rarity: string;
  color: string[];
  subtypes: string[];
  symbols: string[];
  core: CoreLevel[];
  effects: Effect[];
}

export interface DeckCard {
  card_id: string;
  count: number;
}

export interface Deck {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
  colors: Record<string, number>;
  cards?: DeckCard[];
}
