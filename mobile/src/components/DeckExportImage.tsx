import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Deck, DeckCard, Card } from '../types';

// ── Palette (matches Design A) ────────────────────────────────────────────────

const P = {
  bg:      '#121212',
  surface: '#1e1e1e',
  border:  '#2a2a2a',
  text:    '#f0f0f0',
  muted:   '#888888',
  accent:  '#f5c518',
} as const;

const ELEMENT_COLORS: Record<string, string> = {
  red: '#e3493d', blue: '#3a7dd9', green: '#4caf50',
  yellow: '#f5c518', purple: '#9b59b6', white: '#e8e8e8',
};

const ELEMENT_LABEL: Record<string, string> = {
  red: 'Red', blue: 'Blue', green: 'Green',
  yellow: 'Yellow', purple: 'Purple', white: 'White',
};

const ELEMENT_ORDER = ['red', 'blue', 'green', 'yellow', 'purple', 'white'] as const;
type ElementKey = typeof ELEMENT_ORDER[number];

const COLOR_TO_ELEMENT: Record<string, ElementKey> = {
  Red: 'red', Blue: 'blue', Green: 'green', Yellow: 'yellow', Purple: 'purple', White: 'white',
};

const TYPE_TO_KIND: Record<string, 'spirit' | 'nexus' | 'magic'> = {
  SPIRIT: 'spirit', NEXUS: 'nexus', MAGIC: 'magic',
};

// ── Layout ────────────────────────────────────────────────────────────────────

const TOTAL_W = 360;
const SIDE_PAD = 14;
const CARD_COLS = 4;
const CARD_GAP = 5;
const CARD_W = Math.floor((TOTAL_W - SIDE_PAD * 2 - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS);
const CARD_H = Math.round(CARD_W * 88 / 63);

const SB_COLS = 5;
const SB_CARD_W = Math.floor((TOTAL_W - SIDE_PAD * 2 - CARD_GAP * (SB_COLS - 1)) / SB_COLS);
const SB_CARD_H = Math.round(SB_CARD_W * 88 / 63);

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardEntry {
  card_id: string;
  name: string;
  cost: number;
  elements: ElementKey[];
  kind: 'spirit' | 'nexus' | 'magic';
  count: number;
}

interface DeckStats {
  total: number;
  avgCost: number;
  byKind: { spirit: number; nexus: number; magic: number };
  byElement: Record<ElementKey, number>;
  byElementWeighted: Record<ElementKey, number>;
  multiColorCount: number;
}

interface Props {
  deck: Deck & { cards: DeckCard[]; sideboard?: DeckCard[] };
  cardMap: Record<string, Card>;
  onReady: (ref: React.RefObject<View | null>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEntries(cards: DeckCard[], cardMap: Record<string, Card>): CardEntry[] {
  return cards.flatMap(dc => {
    const card = cardMap[dc.card_id];
    if (!card) return [];
    const elements = (card.color ?? [])
      .map(c => COLOR_TO_ELEMENT[c])
      .filter((e): e is ElementKey => !!e);
    return [{
      card_id: dc.card_id,
      name: card.name,
      cost: card.cost,
      elements: elements.length > 0 ? elements : ['white'],
      kind: TYPE_TO_KIND[card.type] ?? 'spirit',
      count: dc.count,
    }];
  });
}

function deriveStats(entries: CardEntry[]): DeckStats {
  const zero = () => Object.fromEntries(ELEMENT_ORDER.map(e => [e, 0])) as Record<ElementKey, number>;
  const total = entries.reduce((s, c) => s + c.count, 0);
  const totalCost = entries.reduce((s, c) => s + c.cost * c.count, 0);
  const byKind = { spirit: 0, nexus: 0, magic: 0 };
  const byElement = zero();
  const byElementWeighted = zero();
  let multiColorCount = 0;

  entries.forEach(c => {
    byKind[c.kind] += c.count;
    if (c.elements.length > 1) multiColorCount += c.count;
    c.elements.forEach(el => {
      byElement[el] += c.count;
      byElementWeighted[el] += c.count / c.elements.length;
    });
  });

  return { total, avgCost: total > 0 ? totalCost / total : 0, byKind, byElement, byElementWeighted, multiColorCount };
}

function sortEntries(entries: CardEntry[]): CardEntry[] {
  const order = { spirit: 0, nexus: 1, magic: 2 } as const;
  return [...entries].sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.name.localeCompare(b.name);
  });
}

// ── Donut ─────────────────────────────────────────────────────────────────────

function DonutChart({ stats }: { stats: DeckStats }) {
  const SIZE = 90, STROKE = 12;
  const cx = SIZE / 2, cy = SIZE / 2;
  const r = (SIZE - STROKE) / 2;

  const totalW = ELEMENT_ORDER.reduce((s, e) => s + stats.byElementWeighted[e], 0);
  let acc = 0;
  const arcs = ELEMENT_ORDER
    .filter(e => stats.byElementWeighted[e] > 0)
    .map(e => {
      const v = stats.byElementWeighted[e];
      const start = acc / totalW;
      acc += v;
      return { e, start, end: acc / totalW };
    });

  const pol = (frac: number): [number, number] => {
    const a = frac * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={P.surface} strokeWidth={STROKE} />
      {arcs.map((a, i) => {
        if (a.end - a.start >= 0.999) {
          return <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={ELEMENT_COLORS[a.e]} strokeWidth={STROKE} />;
        }
        const [x1, y1] = pol(a.start);
        const [x2, y2] = pol(a.end);
        const large = a.end - a.start > 0.5 ? 1 : 0;
        return (
          <Path key={i}
            d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
            fill="none" stroke={ELEMENT_COLORS[a.e]} strokeWidth={STROKE} strokeLinecap="butt"
          />
        );
      })}
      <SvgText
        x={cx} y={cy + SIZE * 0.09} textAnchor="middle"
        fontSize={SIZE * 0.22} fontWeight="700" fill={P.text}
      >{stats.total}</SvgText>
      <SvgText
        x={cx} y={cy + SIZE * 0.26} textAnchor="middle"
        fontSize={SIZE * 0.085} fill={P.muted} letterSpacing={1}
      >CARDS</SvgText>
    </Svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ name, date }: { name: string; date: string }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.exportLabel}>Deck Export</Text>
        <Text style={s.deckName} numberOfLines={2}>{name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.dateText}>{date}</Text>
        <Text style={s.dateText}>v1.0</Text>
      </View>
    </View>
  );
}

function StatPair({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

function CompactSummary({ stats }: { stats: DeckStats }) {
  const usedElements = ELEMENT_ORDER.filter(e => stats.byElement[e] > 0);
  return (
    <View style={s.summary}>
      <DonutChart stats={stats} />

      <View style={s.statPairs}>
        <StatPair label="Avg Cost" value={stats.avgCost.toFixed(1)} />
        <StatPair
          label="Spirit / Nexus / Magic"
          value={`${stats.byKind.spirit} / ${stats.byKind.nexus} / ${stats.byKind.magic}`}
          sub={stats.multiColorCount > 0 ? `${stats.multiColorCount} multi-color` : 'breakdown'}
        />
      </View>

      <View style={s.legend}>
        {usedElements.map(e => (
          <View key={e} style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: ELEMENT_COLORS[e] }]} />
            <Text style={s.legendName}>{ELEMENT_LABEL[e]}</Text>
            <Text style={s.legendCount}>{stats.byElement[e]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionLabel({ label, total, unique }: { label: string; total: number; unique: number }) {
  return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>{label}</Text>
      <View style={s.sectionLine} />
      <Text style={s.sectionCount}>{total} cards · {unique} unique</Text>
    </View>
  );
}

function CardGrid({ sorted, onImageSettle }: { sorted: CardEntry[]; onImageSettle: () => void }) {
  const groups = [
    { kind: 'spirit' as const, label: 'Spirits' },
    { kind: 'nexus'  as const, label: 'Nexus'   },
    { kind: 'magic'  as const, label: 'Magic'   },
  ];
  return (
    <View>
      {groups.map(g => {
        const items = sorted.filter(c => c.kind === g.kind);
        if (!items.length) return null;
        const total = items.reduce((sum, c) => sum + c.count, 0);
        return (
          <View key={g.kind}>
            <SectionLabel label={g.label} total={total} unique={items.length} />
            <View style={s.cardRow}>
              {items.map((c, i) => (
                <View key={`${c.card_id}-${i}`} style={s.cardSlot}>
                  <Image
                    source={{ uri: `https://www.bssdb.dev/cards/bss/${c.card_id}.png` }}
                    style={s.cardImage}
                    resizeMode="cover"
                    onLoad={onImageSettle}
                    onError={onImageSettle}
                  />
                  {c.count > 1 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>×{c.count}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SideboardSection({ entries, onImageSettle }: { entries: CardEntry[]; onImageSettle: () => void }) {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, c) => s + c.count, 0);
  return (
    <View>
      <SectionLabel label="Sideboard" total={total} unique={entries.length} />
      <View style={s.sbRow}>
        {entries.map((c, i) => (
          <View key={`sb-${c.card_id}-${i}`} style={s.sbSlot}>
            <Image
              source={{ uri: `https://www.bssdb.dev/cards/bss/${c.card_id}.png` }}
              style={s.sbImage}
              resizeMode="cover"
              onLoad={onImageSettle}
              onError={onImageSettle}
            />
            {c.count > 1 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>×{c.count}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Footer({ total, sbTotal }: { total: number; sbTotal: number }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerLeft}>EXPORTED · BSS COMPANION</Text>
      <Text style={s.footerRight}>
        {sbTotal > 0 ? `${total} CARDS + ${sbTotal} SB` : `${total} CARDS`}
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DeckExportImage = React.forwardRef<View, Props>(({ deck, cardMap, onReady }, _) => {
  const viewRef = useRef<View>(null);
  const entries   = useMemo(() => buildEntries(deck.cards, cardMap), [deck.cards, cardMap]);
  const sbEntries = useMemo(() => buildEntries(deck.sideboard ?? [], cardMap), [deck.sideboard, cardMap]);
  const stats     = useMemo(() => deriveStats(entries), [entries]);
  const sorted    = useMemo(() => sortEntries(entries), [entries]);
  const uniqueCount = entries.length + sbEntries.length;
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (uniqueCount === 0 || loadedCount >= uniqueCount) onReady(viewRef);
  }, [loadedCount, uniqueCount]);

  const onImageSettle = () => setLoadedCount(c => c + 1);

  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  const sbTotal = sbEntries.reduce((s, c) => s + c.count, 0);

  return (
    <View ref={viewRef} style={s.root} collapsable={false}>
      <Header name={deck.name} date={date} />
      <CompactSummary stats={stats} />
      <CardGrid sorted={sorted} onImageSettle={onImageSettle} />
      <SideboardSection entries={sbEntries} onImageSettle={onImageSettle} />
      <Footer total={stats.total} sbTotal={sbTotal} />
    </View>
  );
});

export default DeckExportImage;

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    width: TOTAL_W,
    backgroundColor: P.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    gap: 12,
  },
  exportLabel: {
    color: P.accent,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  deckName: {
    color: P.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  dateText: {
    color: P.muted,
    fontSize: 10,
    fontFamily: 'monospace',
    textAlign: 'right',
    lineHeight: 15,
  },

  // Compact summary
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE_PAD,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    gap: 10,
  },
  statPairs: {
    flex: 1,
    gap: 7,
  },
  statLabel: {
    color: P.muted,
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    color: P.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 18,
  },
  statSub: {
    color: P.muted,
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  legend: {
    gap: 5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendName: {
    color: P.text,
    fontSize: 10,
    flex: 1,
  },
  legendCount: {
    color: P.muted,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
  },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 8,
    paddingBottom: 5,
    gap: 10,
  },
  sectionLabelText: {
    color: P.muted,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: P.border,
  },
  sectionCount: {
    color: P.muted,
    fontSize: 9,
    fontFamily: 'monospace',
  },

  // Card grid
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIDE_PAD,
    gap: CARD_GAP,
    paddingBottom: 10,
  },
  cardSlot: {
    width: CARD_W,
    height: CARD_H,
  },
  cardImage: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 5,
    backgroundColor: P.border,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: P.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#121212',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    lineHeight: 10,
  },

  // Sideboard grid (5-col, compact)
  sbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIDE_PAD,
    gap: CARD_GAP,
    paddingBottom: 10,
  },
  sbSlot: {
    width: SB_CARD_W,
    height: SB_CARD_H,
  },
  sbImage: {
    width: SB_CARD_W,
    height: SB_CARD_H,
    borderRadius: 4,
    backgroundColor: P.border,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PAD,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: P.border,
  },
  footerLeft: {
    color: P.muted,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  footerRight: {
    color: P.accent,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
