import { cardsDb } from '../init';
import { KeywordDef, QAItem, CardRuling } from '../../types';

// ── Keywords ──────────────────────────────────────────────────────────────────

export async function getKeywords(): Promise<KeywordDef[]> {
  const rows = await cardsDb.getAllAsync<{
    name: string;
    description: string | null;
    qa_count: number;
  }>(
    `SELECT k.Name AS name, k.Description AS description,
       (SELECT COUNT(*) FROM QA_keywords q WHERE q.KeywordID = k.KeywordID) AS qa_count
     FROM Keywords k
     ORDER BY k.Name`,
  );
  return rows.map(r => ({
    name:        r.name,
    description: r.description ?? '',
    qa_count:    r.qa_count,
  }));
}

export async function getKeywordDetail(
  name: string,
): Promise<{ name: string; description: string; qa: QAItem[] }> {
  const kw = await cardsDb.getFirstAsync<{
    KeywordID: number;
    description: string | null;
  }>(
    'SELECT KeywordID, Description AS description FROM Keywords WHERE Name = ?',
    [name],
  );
  if (!kw) return { name, description: '', qa: [] };

  const qaRows = await cardsDb.getAllAsync<{ question: string; answer: string }>(
    'SELECT Question AS question, Answer AS answer FROM QA_keywords WHERE KeywordID = ?',
    [kw.KeywordID],
  );

  return {
    name,
    description: kw.description ?? '',
    qa: qaRows,
  };
}

// ── Card rulings ──────────────────────────────────────────────────────────────

export async function getCardRulings(): Promise<CardRuling[]> {
  const rows = await cardsDb.getAllAsync<{
    card_id: string;
    card_name: string;
    question: string;
    answer: string;
  }>(
    `SELECT q.CardID AS card_id, c.Name AS card_name,
       q.Question AS question, q.Answer AS answer
     FROM QA_cards q JOIN Cards c ON q.CardID = c.CardID
     ORDER BY q.CardID`,
  );
  return rows;
}

export async function getCardRulingsById(cardId: string): Promise<QAItem[]> {
  const rows = await cardsDb.getAllAsync<{ question: string; answer: string }>(
    'SELECT Question AS question, Answer AS answer FROM QA_cards WHERE CardID = ?',
    [cardId],
  );
  return rows;
}
