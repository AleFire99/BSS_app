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
  alt_art_ids: string[];
}

export interface KeywordDef {
  name: string;
  description: string;
  qa_count: number;
}

export interface QAItem {
  question: string;
  answer: string;
}

export interface CardRuling {
  card_id: string;
  card_name: string;
  question: string;
  answer: string;
}

export interface DeckCard {
  card_id: string;
  count: number;
  section: 'main' | 'sideboard';
}

export interface Deck {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
  sideboard_count: number;
  colors: Record<string, number>;
  type_counts: Record<string, number>;
  avg_cost: number;
  cards?: DeckCard[];
  sideboard?: DeckCard[];
}

export interface SwapPlan {
  id: number;
  deck_id: number;
  name: string;
  notes: string | null;
  cards: SwapPlanCard[];
}

export interface SwapPlanCard {
  card_id: string;
  direction: 'out' | 'in';
  count: number;
  card?: Card;
}
