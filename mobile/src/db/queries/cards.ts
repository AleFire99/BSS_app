import { cardsDb } from '../init';
import { Card, Effect, Keyword, CoreLevel } from '../../types';

// ── Raw row shapes ────────────────────────────────────────────────────────────

interface CardRow {
  CardID: string;
  Name: string;
  type: string;
  set_name: string;
  Cost: number;
  Rarity: string;
  colors: string | null;
  subtypes: string | null;
  symbols: string | null;
  alt_art_ids: string | null;
}

interface EffectRow {
  CardID: string;
  condition_text: string;
  details: string;
  levels: string | null;
  keywords: string | null;
  steps: string | null;
}

interface CoreRow {
  CardID: string;
  Level: number;
  BP: number;
  Cores: number;
}

// ── Translation overlay ───────────────────────────────────────────────────────

type CardTranslationEntry = { effects?: string[] };
type TranslationMap = Record<string, CardTranslationEntry>;

let _lang = 'en';
let _translationsIt: TranslationMap = {};

export function setCardTranslations(lang: string, data: TranslationMap): void {
  if (lang === 'it') _translationsIt = data;
}

export function setCardLanguage(lang: string): void {
  _lang = lang;
}

// ── SQL ───────────────────────────────────────────────────────────────────────

// Use || as GROUP_CONCAT entry delimiter to safely handle "4,5" list modifiers.
const CARDS_SQL = `
  SELECT
    c.CardID, c.Name, ct.Name AS type, s.Name AS set_name, c.Cost, c.Rarity,
    (SELECT GROUP_CONCAT(col.Name, '|')
     FROM CardColors cc JOIN Colors col ON cc.ColorID = col.ColorID
     WHERE cc.CardID = c.CardID) AS colors,
    (SELECT GROUP_CONCAT(sub.Name, '|')
     FROM CardSubtypes cs JOIN Subtypes sub ON cs.SubtypeID = sub.SubtypeID
     WHERE cs.CardID = c.CardID) AS subtypes,
    (SELECT GROUP_CONCAT(sym.Name, '|')
     FROM CardSymbols csm JOIN Symbols sym ON csm.SymbolID = sym.SymbolID
     WHERE csm.CardID = c.CardID) AS symbols,
    (SELECT GROUP_CONCAT(alt.CardID, '|')
     FROM Cards alt
     WHERE alt.Name = c.Name AND alt.CardID != c.CardID AND alt.CardID LIKE '%_p%') AS alt_art_ids
  FROM Cards c
  JOIN CardTypes ct ON c.TypeID = ct.TypeID
  JOIN Sets      s  ON c.SetID  = s.SetID
  WHERE c.CardID NOT LIKE '%_p%'
  ORDER BY s.Name, c.CardID`;

const EFFECTS_SQL = `
  SELECT
    e.CardID,
    COALESCE(cond.Description, '') AS condition_text,
    COALESCE(e.Description, '')    AS details,
    (SELECT GROUP_CONCAT(cr.Level, ',')
     FROM EffectLevels el JOIN Core cr ON el.CoreID = cr.CoreID
     WHERE el.EffectID = e.EffectID) AS levels,
    (SELECT GROUP_CONCAT(k.Name || ':' || COALESCE(ek.Modifier, ''), '||')
     FROM EffectKeywords ek JOIN Keywords k ON ek.KeywordID = k.KeywordID
     WHERE ek.EffectID = e.EffectID) AS keywords,
    (SELECT GROUP_CONCAT(st.Name, ',')
     FROM EffectSteps es JOIN Steps st ON es.StepID = st.StepID
     WHERE es.EffectID = e.EffectID) AS steps
  FROM Effects e
  LEFT JOIN Conditions cond ON e.ConditionID = cond.ConditionID
  WHERE e.CardID NOT LIKE '%_p%'
  ORDER BY e.CardID, e.EffectID`;

const CORE_SQL = `
  SELECT CardID, Level, BP, Cores
  FROM Core
  WHERE CardID NOT LIKE '%_p%'
  ORDER BY CardID, Level`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseKeywords(raw: string | null): Keyword[] {
  if (!raw) return [];
  return raw.split('||').map(entry => {
    const colonIdx = entry.lastIndexOf(':');
    const name = entry.substring(0, colonIdx);
    const modStr = entry.substring(colonIdx + 1);
    const modifier: string | number | null =
      modStr === ''           ? null
      : isNaN(Number(modStr)) ? modStr   // string or "4,5" list
      : Number(modStr);
    return { name, modifier };
  });
}

function assembleCards(
  cardRows: CardRow[],
  effectRows: EffectRow[],
  coreRows: CoreRow[],
): Card[] {
  const effectsMap = new Map<string, Effect[]>();
  for (const row of effectRows) {
    const effect: Effect = {
      condition: row.condition_text || null,
      details:   row.details || null,
      levels:    row.levels ? row.levels.split(',').map(Number) : [],
      keywords:  parseKeywords(row.keywords),
      steps:     row.steps ? row.steps.split(',') : [],
    };
    if (!effectsMap.has(row.CardID)) effectsMap.set(row.CardID, []);
    effectsMap.get(row.CardID)!.push(effect);
  }

  const coreMap = new Map<string, CoreLevel[]>();
  for (const row of coreRows) {
    if (!coreMap.has(row.CardID)) coreMap.set(row.CardID, []);
    coreMap.get(row.CardID)!.push({ lv: row.Level, bp: row.BP, cores: row.Cores });
  }

  return cardRows.map(row => {
    const effects = effectsMap.get(row.CardID) ?? [];
    let name = row.Name;

    let subtypes = row.subtypes ? row.subtypes.split('|') : [];

    if (_lang === 'it') {
      const tr = _translationsIt[row.CardID];
      if (tr?.effects && tr.effects.length > 0) {
        let tIdx = 0;
        for (let i = 0; i < effects.length && tIdx < tr.effects.length; i++) {
          const d = effects[i].details;
          if (d && d !== 'N/A') {
            effects[i] = { ...effects[i], details: tr.effects[tIdx++] };
          }
        }
      }
    }

    return {
      id:          row.CardID,
      name,
      type:        row.type,
      set:         row.set_name,
      cost:        row.Cost,
      rarity:      row.Rarity,
      color:       row.colors   ? row.colors.split('|')   : [],
      subtypes,
      symbols:     row.symbols  ? row.symbols.split('|')  : [],
      core:        coreMap.get(row.CardID) ?? [],
      effects,
      alt_art_ids: row.alt_art_ids ? row.alt_art_ids.split('|') : [],
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCards(): Promise<Card[]> {
  const [cardRows, effectRows, coreRows] = await Promise.all([
    cardsDb.getAllAsync<CardRow>(CARDS_SQL),
    cardsDb.getAllAsync<EffectRow>(EFFECTS_SQL),
    cardsDb.getAllAsync<CoreRow>(CORE_SQL),
  ]);
  return assembleCards(cardRows, effectRows, coreRows);
}

export async function getCard(id: string): Promise<Card> {
  const cardRows = await cardsDb.getAllAsync<CardRow>(
    CARDS_SQL.replace('WHERE c.CardID NOT LIKE \'%_p%\'', 'WHERE c.CardID = ?'),
    [id],
  );
  if (cardRows.length === 0) throw new Error(`Card not found: ${id}`);

  const effectRows = await cardsDb.getAllAsync<EffectRow>(
    EFFECTS_SQL.replace('WHERE e.CardID NOT LIKE \'%_p%\'', 'WHERE e.CardID = ?'),
    [id],
  );
  const coreRows = await cardsDb.getAllAsync<CoreRow>(
    CORE_SQL.replace('WHERE CardID NOT LIKE \'%_p%\'', 'WHERE CardID = ?'),
    [id],
  );
  return assembleCards(cardRows, effectRows, coreRows)[0];
}
