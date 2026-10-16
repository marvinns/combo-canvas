import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ENDBOARD_SLOT_IDS,
  normalizeEndboardSlotCards,
  searchYgoCards,
  serializeEndboardSlotCards,
  type EndboardSlotId,
  type EndboardSlots,
  type PersistedEndboardSlots,
  type YgoSearchCard,
} from '@/lib/endboard';
import { EndboardBuilder } from '@/components/EndboardBuilder';
import { CardActivationOverlay, CardDisplay } from '@/components/CardDisplay';
import { useCardImage } from '@/hooks/useCardImage';
import {
  calculateHandtrapStatistics,
  COUNTER_CARD_CATEGORIES,
  createCounterGuideId,
  DECK_TIERS,
  getCounterCardById,
  getCounterComments,
  getCounterGuideData,
  getDeckById,
  getPairingCounterCardIds,
  getPairingCounteredCards,
  getPairingsForDeck,
  IMPACT_RATINGS,
  saveCounterComments,
  saveCounterGuideData,
  type CounterCard,
  type CounterComment,
  type CounterDeck,
  type CounterGuideData,
  type CounterPairing,
  type DeckTier,
  type ImpactRating,
} from '@/lib/counterGuide';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

type FilterValue<T extends string> = T | 'all';

const TIER_STYLES: Record<DeckTier, string> = {
  'Tier 1': 'border-rose-300/35 bg-rose-300/12 text-rose-100',
  'Tier 2': 'border-amber-300/35 bg-amber-300/12 text-amber-100',
  'Tier 3': 'border-sky-300/35 bg-sky-300/12 text-sky-100',
  Rogue: 'border-violet-300/35 bg-violet-300/12 text-violet-100',
  'Low Tier': 'border-slate-300/30 bg-slate-300/10 text-slate-100',
};

const IMPACT_STYLES: Record<ImpactRating, string> = {
  High: 'border-emerald-300/40 bg-emerald-300/12 text-emerald-100',
  Medium: 'border-amber-300/40 bg-amber-300/12 text-amber-100',
  Low: 'border-slate-300/35 bg-slate-300/10 text-slate-100',
};

const MATCHUP_CARD_STYLES = [
  'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
  'border-sky-300/35 bg-sky-300/12 text-sky-100',
  'border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100',
  'border-amber-300/35 bg-amber-300/12 text-amber-100',
  'border-violet-300/35 bg-violet-300/12 text-violet-100',
];

const DEFAULT_ENDBOARD_SLOT_ORDER: EndboardSlotId[] = [
  'monster-1',
  'monster-2',
  'monster-3',
  'monster-4',
  'monster-5',
  'spell-1',
  'spell-2',
  'spell-3',
  'spell-4',
  'spell-5',
  'extra-left',
  'extra-right',
];
const CARD_CYCLE_INTERVAL_MS = 2000;

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getTierSortIndex(tier: DeckTier): number {
  return DECK_TIERS.indexOf(tier);
}

function compareDecksByTier(a: CounterDeck, b: CounterDeck): number {
  return getTierSortIndex(a.tier) - getTierSortIndex(b.tier) || a.name.localeCompare(b.name);
}

function createCommentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createUniqueId(label: string, fallbackPrefix: string, usedIds: Iterable<string>): string {
  const used = new Set(usedIds);
  const base = createCounterGuideId(label, fallbackPrefix);
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-display font-semibold', className)}>
      {children}
    </span>
  );
}

function MatchupCardName({ name, toneIndex }: { name: string; toneIndex: number }) {
  return (
    <span className={cn(
      'inline-flex max-w-full items-center rounded-md border px-2 py-1 text-sm leading-tight',
      MATCHUP_CARD_STYLES[toneIndex % MATCHUP_CARD_STYLES.length],
    )}>
      <span className="truncate">{name}</span>
    </span>
  );
}

function CardArt({ name, onPreviewOpenChange }: { name: string; onPreviewOpenChange: (open: boolean) => void }) {
  return <CardDisplay name={name} artworkOnly useStarBorder={false} onPreviewOpenChange={onPreviewOpenChange} />;
}

function StatisticsMatchupVisual({ cards, targets }: { cards: CounterCard[]; targets: string[] }) {
  const [countersExpanded, setCountersExpanded] = useState(false);
  const [targetsExpanded, setTargetsExpanded] = useState(false);

  return (
    <div className="flex flex-wrap items-start justify-center gap-3 py-3 sm:justify-start" role="group" aria-label="Handtrap and opposing cards">
      <CounterCardStack
        cards={cards}
        isExpanded={countersExpanded}
        onToggleExpanded={() => setCountersExpanded((current) => !current)}
        showActivation
      />
      {targets.length > 0 && (
        <>
          <div className="flex h-[164px] shrink-0 flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
            <Swords className="h-5 w-5 text-emerald-200" />
            <div className="h-10 w-px bg-border/70" />
            <ShieldAlert className="h-5 w-5 text-rose-200" />
          </div>
          <CounteredCardStack
            cardNames={targets}
            isExpanded={targetsExpanded}
            onToggleExpanded={() => setTargetsExpanded((current) => !current)}
          />
        </>
      )}
    </div>
  );
}

function CounteredCardStack({
  cardNames,
  isExpanded,
  onToggleExpanded,
}: {
  cardNames: string[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
}) {
  const topCardName = cardNames[cardNames.length - 1];
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const cardKey = cardNames.join('|');
  const activeCardName = cardNames[activeCardIndex] || topCardName || 'Countered card';

  useEffect(() => {
    setActiveCardIndex(0);
  }, [cardKey]);

  useEffect(() => {
    if (isPreviewOpen || cardNames.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveCardIndex((current) => (current + 1) % cardNames.length);
    }, CARD_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [cardKey, cardNames.length, isPreviewOpen]);

  return (
    <div className="min-w-0">
      <div className="w-[112px] shrink-0">
        <div className="relative h-[164px] w-[112px] overflow-hidden rounded-md border border-border/60 bg-secondary/60 shadow-[0_10px_28px_rgba(0,0,0,0.26)]">
          {cardNames.length > 0 ? (
            <>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeCardName}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.015 }}
                  transition={{ duration: 0.42, ease: 'easeInOut' }}
                >
                  <CardArt name={activeCardName} onPreviewOpenChange={setIsPreviewOpen} />
                </motion.div>
              </AnimatePresence>
              {cardNames.length > 1 && (
                <motion.div
                  key={`countered-glare-${activeCardName}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-[-35%] w-[48%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
                  initial={{ left: '-65%', opacity: 0 }}
                  animate={{ left: '125%', opacity: [0, 0.8, 0] }}
                  transition={{ duration: 0.72, ease: 'easeInOut' }}
                />
              )}
              {cardNames.length > 1 && (
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  className="absolute bottom-1 left-1 z-40 rounded-full border border-white/25 bg-black/75 px-1.5 py-0.5 text-[10px] font-display font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-black"
                  aria-expanded={isExpanded}
                >
                  {cardNames.length} cards
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-border/60 bg-secondary/35 p-2 text-center text-[11px] text-muted-foreground">
              No target selected
            </div>
          )}
        </div>
        <p className="mt-2 min-h-8 text-center text-[11px] leading-tight text-muted-foreground">
          {activeCardName || 'Countered cards'}
        </p>
      </div>
      {isExpanded && cardNames.length > 1 && (
        <div className="mt-3 grid gap-2">
          {cardNames.map((cardName) => (
            <div key={cardName} className="rounded-md border border-border/45 bg-secondary/35 px-2.5 py-2">
              <span className="block min-w-0 truncate text-xs font-display font-semibold text-foreground">{cardName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function deckToEndboardSlots(deck: CounterDeck): EndboardSlots {
  const slots: EndboardSlots = {};

  if (deck.endboardSlots && Object.keys(deck.endboardSlots).length > 0) {
    Object.entries(deck.endboardSlots).forEach(([slotId, slotCards]) => {
      if (!ENDBOARD_SLOT_IDS.has(slotId as EndboardSlotId)) return;
      const cards = normalizeEndboardSlotCards(slotCards);
      if (cards.length > 0) slots[slotId as EndboardSlotId] = cards;
    });
    return slots;
  }

  deck.endboard.forEach((cardName, index) => {
    const slotId = DEFAULT_ENDBOARD_SLOT_ORDER[index];
    if (slotId) slots[slotId] = [cardName];
  });

  return slots;
}

function serializeEndboardSlots(slots: EndboardSlots): PersistedEndboardSlots {
  return Object.fromEntries(
    Object.entries(slots).flatMap(([slotId, cards]) => {
      const serialized = serializeEndboardSlotCards(cards || []);
      return serialized ? [[slotId, serialized]] : [];
    }),
  );
}

function flattenEndboardSlots(slots: EndboardSlots): string[] {
  const slotIds = [
    ...DEFAULT_ENDBOARD_SLOT_ORDER,
    ...Object.keys(slots).filter((slotId) => !DEFAULT_ENDBOARD_SLOT_ORDER.includes(slotId as EndboardSlotId)),
  ];

  return slotIds.flatMap((slotId) => normalizeEndboardSlotCards(slots[slotId as EndboardSlotId]));
}

function getDeckTag(deck: CounterDeck): string {
  if (deck.id.includes('fire')) return 'Fire';
  if (deck.id.includes('dragon')) return 'Dragon';
  if (deck.id.includes('forest')) return 'Synchro';
  if (deck.id.includes('branded')) return 'Fusion';
  if (deck.id.includes('lab')) return 'Trap';
  return deck.name.split(/[\s-]+/)[0] || 'Deck';
}

function DeckThumbnail({ deck, className }: { deck: CounterDeck; className?: string }) {
  const cardName = deck.thumbnailCardName?.trim() || deck.endboard[0]?.trim() || '';
  const cardImage = useCardImage(cardName);
  const imageUrl = cardImage.data?.croppedImageUrl || cardImage.data?.imageUrl;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/25 bg-primary/10 font-display font-bold text-primary',
        className,
      )}
      title={cardName || deck.name}
    >
      {imageUrl && cardName ? (
        <img
          src={imageUrl}
          alt={`${deck.name} thumbnail`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : cardName && cardImage.isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : cardName ? (
        <span className="px-1 text-center text-[9px] leading-tight text-muted-foreground">
          {cardName}
        </span>
      ) : (
        <span className="h-5 w-3 rounded-[2px] border border-primary/35 bg-primary/15" />
      )}
    </span>
  );
}

function doesDeckMatchQuery(deck: CounterDeck, pairings: CounterPairing[], counterCards: CounterCard[], query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const values = [
    deck.name,
    deck.tier,
    deck.thumbnailCardName || '',
    deck.plan,
    getDeckTag(deck),
    ...deck.endboard,
    ...pairings.flatMap((pairing) => [
      pairing.impact,
      ...getPairingCounteredCards(pairing),
      pairing.summary,
      pairing.timing,
      ...pairing.tags,
      ...getPairingCounterCardIds(pairing).map((id) => getCounterCardById(id, counterCards)?.name || ''),
    ]),
  ];

  return values.some((value) => normalizeSearch(value).includes(normalizedQuery));
}

function CounterCardStack({
  cards,
  isExpanded,
  onToggleExpanded,
  showActivation = false,
}: {
  cards: CounterCard[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  showActivation?: boolean;
}) {
  const topCard = cards[cards.length - 1];
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const cardKey = cards.map((card) => card.id).join('|');
  const activeCard = cards[activeCardIndex] || topCard;

  useEffect(() => {
    setActiveCardIndex(0);
  }, [cardKey]);

  useEffect(() => {
    if (isPreviewOpen || cards.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveCardIndex((current) => (current + 1) % cards.length);
    }, CARD_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [cardKey, cards.length, isPreviewOpen]);

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-center gap-3 sm:justify-start">
        <div className="w-[112px] shrink-0">
          <div className="relative h-[164px] w-[112px] overflow-hidden rounded-md border border-border/60 bg-secondary/60 shadow-[0_10px_28px_rgba(0,0,0,0.26)]">
            {activeCard && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeCard.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.015 }}
                  transition={{ duration: 0.42, ease: 'easeInOut' }}
                >
                  <CardArt name={activeCard.name} onPreviewOpenChange={setIsPreviewOpen} />
                </motion.div>
              </AnimatePresence>
            )}
            {activeCard && showActivation && <CardActivationOverlay />}
            {cards.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-border/60 bg-secondary/35 p-2 text-center text-[11px] text-muted-foreground">
                No counter selected
              </div>
            )}
            {cards.length > 1 && (
              <motion.div
                key={`counter-glare-${activeCard?.id}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-[-35%] w-[48%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
                initial={{ left: '-65%', opacity: 0 }}
                animate={{ left: '125%', opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.72, ease: 'easeInOut' }}
              />
            )}
            {cards.length > 1 && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="absolute bottom-1 left-1 z-40 rounded-full border border-white/25 bg-black/75 px-1.5 py-0.5 text-[10px] font-display font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-black"
                aria-expanded={isExpanded}
              >
                {cards.length} cards
              </button>
            )}
          </div>
          <p className="mt-2 min-h-8 text-center text-[11px] leading-tight text-muted-foreground">
            {activeCard?.name || 'Counter cards'}
          </p>
        </div>
      </div>
      {isExpanded && cards.length > 1 && (
        <div className="mt-3 grid gap-2">
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between gap-2 rounded-md border border-border/45 bg-secondary/35 px-2.5 py-2">
              <span className="min-w-0 truncate text-xs font-display font-semibold text-foreground">{card.name}</span>
              <Badge className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">{card.category}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardNameDraft({ value, label, onCommit }: { value: string; label: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <input
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) {
          setDraft(value);
          onCommit(draft);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      }}
      className="h-9 min-w-0 rounded-md border border-border bg-background/60 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}

function CounterCardSelector({
  selectedIds,
  counterCards,
  onChange,
  onCreateCounterCard,
  onUpdateCounterCard,
  onDeleteCounterCard,
}: {
  selectedIds: string[];
  counterCards: CounterCard[];
  onChange: (counterCardIds: string[]) => void;
  onCreateCounterCard: (card: CounterCard) => void;
  onUpdateCounterCard: (counterCardId: string, updates: Partial<CounterCard>) => void;
  onDeleteCounterCard: (counterCardId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearch(query);
  const selectedCards = selectedIds.flatMap((id) => {
    const card = getCounterCardById(id, counterCards);
    return card ? [card] : [];
  });
  const matches = counterCards
    .filter((card) => !selectedIds.includes(card.id))
    .filter((card) => !normalizedQuery || normalizeSearch(`${card.name} ${card.category}`).includes(normalizedQuery))
    .slice(0, 8);
  const exactMatch = counterCards.some((card) => normalizeSearch(card.name) === normalizedQuery);

  const addCounterCard = (counterCardId: string) => {
    onChange(Array.from(new Set([...selectedIds, counterCardId])));
    setQuery('');
  };

  const createCounterCard = () => {
    const name = query.trim();
    if (!name) return;

    const id = createUniqueId(name, 'counter-card', counterCards.map((card) => card.id));
    onCreateCounterCard({ id, name, category: 'Handtrap' });
    onChange([...selectedIds, id]);
    setQuery('');
  };

  return (
    <div className="space-y-3 rounded-md border border-border/45 bg-background/25 p-3">
      <div className="space-y-2">
        {selectedCards.map((card) => (
          <div key={card.id} className="grid gap-2 rounded-md border border-border/45 bg-secondary/35 p-2 sm:grid-cols-[minmax(0,1fr)_150px_32px]">
            <CardNameDraft
              value={card.name}
              label="Counter card name"
              onCommit={(name) => onUpdateCounterCard(card.id, { name })}
            />
            <select
              value={card.category}
              onChange={(event) => onUpdateCounterCard(card.id, { category: event.target.value as CounterCard['category'] })}
              className="h-9 rounded-md border border-border bg-background/60 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            >
              {COUNTER_CARD_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button
              type="button"
              onClick={() => onChange(selectedIds.filter((id) => id !== card.id))}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-300/25 bg-rose-300/10 text-rose-200 transition-colors hover:bg-rose-300/15"
              aria-label={`Remove ${card.name}`}
              title="Remove counter"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add counter card..."
          className="h-10 w-full rounded-md border border-border bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
        />
      </label>
      {(matches.length > 0 || (query.trim() && !exactMatch)) && (
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
          {matches.map((card) => (
            <div key={card.id} className="inline-flex items-center rounded-full border border-border/60 bg-secondary/60">
              <button
                type="button"
                onClick={() => addCounterCard(card.id)}
                className="rounded-full px-3 py-1.5 text-xs font-display font-semibold text-foreground transition-colors hover:bg-primary/10"
              >
                {card.name}
              </button>
                <button
                  type="button"
                  onClick={() => onDeleteCounterCard(card.id)}
                  aria-label={`Delete saved suggestion ${card.name}`}
                  title="Delete saved suggestion"
                  className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-300/15 hover:text-rose-200"
                >
                  <X className="h-3 w-3" />
                </button>
            </div>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={createCounterCard}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1.5 text-xs font-display font-semibold text-emerald-100 transition-colors hover:bg-emerald-300/15"
            >
              <Plus className="h-3.5 w-3.5" />
              Create {query.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CounteredCardSelector({
  selectedCards,
  knownCards,
  onChange,
}: {
  selectedCards: string[];
  knownCards: string[];
  onChange: (counteredCards: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearch(query);
  const matches = knownCards
    .filter((cardName) => !selectedCards.some((selectedCard) => normalizeSearch(selectedCard) === normalizeSearch(cardName)))
    .filter((cardName) => !normalizedQuery || normalizeSearch(cardName).includes(normalizedQuery))
    .slice(0, 8);
  const exactMatch = selectedCards.some((cardName) => normalizeSearch(cardName) === normalizedQuery)
    || knownCards.some((cardName) => normalizeSearch(cardName) === normalizedQuery);

  const normalizeCards = (cards: string[]) => {
    const seen = new Set<string>();

    return cards.flatMap((cardName) => {
      const key = cardName.trim().toLowerCase();
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [cardName];
    });
  };

  const updateCard = (index: number, value: string) => {
    const nextCards = [...selectedCards];
    nextCards[index] = value;
    onChange(normalizeCards(nextCards));
  };

  const addCard = (cardName: string) => {
    onChange(normalizeCards([...selectedCards, cardName]));
    setQuery('');
  };

  const removeCard = (cardName: string) => {
    onChange(selectedCards.filter((selectedCard) => selectedCard !== cardName));
  };

  return (
    <div className="space-y-3 rounded-md border border-border/45 bg-background/25 p-3">
      <div className="space-y-2">
        {selectedCards.map((cardName, index) => (
          <div key={`countered-card-${index}`} className="grid gap-2 rounded-md border border-border/45 bg-secondary/35 p-2 sm:grid-cols-[minmax(0,1fr)_32px]">
            <CardNameDraft
              value={cardName}
              label="Countered card name"
              onCommit={(value) => updateCard(index, value)}
            />
            <button
              type="button"
              onClick={() => removeCard(cardName)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-300/25 bg-rose-300/10 text-rose-200 transition-colors hover:bg-rose-300/15"
              aria-label={`Remove ${cardName}`}
              title="Remove target"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add countered card..."
          className="h-10 w-full rounded-md border border-border bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
        />
      </label>
      {(matches.length > 0 || query.trim()) && (
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
          {matches.map((cardName) => (
            <button
              key={cardName}
              type="button"
              onClick={() => addCard(cardName)}
              className="rounded-full border border-border/60 bg-secondary/60 px-3 py-1.5 text-xs font-display font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              {cardName}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={() => addCard(query.trim())}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1.5 text-xs font-display font-semibold text-emerald-100 transition-colors hover:bg-emerald-300/15"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {query.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CounterMatchup({
  pairing,
  counterCards,
  knownCounteredCards,
  comments,
  onUpdatePairing,
  onDeletePairing,
  onCreateCounterCard,
  onUpdateCounterCard,
  onDeleteCounterCard,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: {
  pairing: CounterPairing;
  counterCards: CounterCard[];
  knownCounteredCards: string[];
  comments: CounterComment[];
  onUpdatePairing: (pairingId: string, updates: Partial<CounterPairing>) => void;
  onDeletePairing: (pairingId: string) => void;
  onCreateCounterCard: (card: CounterCard) => void;
  onUpdateCounterCard: (counterCardId: string, updates: Partial<CounterCard>) => void;
  onDeleteCounterCard: (counterCardId: string) => void;
  onAddComment: (pairingId: string, text: string) => void;
  onUpdateComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const counterCardIds = getPairingCounterCardIds(pairing);
  const counteredCards = getPairingCounteredCards(pairing);
  const selectedCounterCards = counterCardIds.flatMap((id) => {
    const card = getCounterCardById(id, counterCards);
    return card ? [card] : [];
  });
  const [draft, setDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [isTargetStackExpanded, setIsTargetStackExpanded] = useState(false);
  const hasCounteredCards = counteredCards.length > 0;

  const startEditingComment = (comment: CounterComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const saveEditingComment = () => {
    if (!editingCommentId) return;
    onUpdateComment(editingCommentId, editingText);
    setEditingCommentId(null);
    setEditingText('');
  };

  const addComment = () => {
    if (!draft.trim()) return;
    onAddComment(pairing.id, draft);
    setDraft('');
  };

  const updateTags = (value: string) => {
    onUpdatePairing(pairing.id, {
      tags: value.split(',').filter((tag) => tag.trim()),
    });
  };

  const updateCounteredCards = (cards: string[]) => {
    const seen = new Set<string>();
    const counteredCards = cards.flatMap((cardName) => {
      const key = cardName.trim().toLowerCase();
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [cardName];
    });

    onUpdatePairing(pairing.id, {
      counteredCard: counteredCards[0] || '',
      counteredCards,
    });
  };

  return (
    <article className="border-b border-border/45 py-5 last:border-b-0">
      <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        <div className={cn(
          'flex items-start justify-center gap-3',
          hasCounteredCards ? 'sm:justify-start' : 'sm:justify-center',
        )}>
          <CounterCardStack
            cards={selectedCounterCards}
            isExpanded={isStackExpanded}
            onToggleExpanded={() => setIsStackExpanded((current) => !current)}
            showActivation={!hasCounteredCards}
          />
          {hasCounteredCards && (
            <>
              <div className="flex h-[164px] shrink-0 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Swords className="h-5 w-5 text-emerald-200" />
                <div className="h-10 w-px bg-border/70" />
                <ShieldAlert className="h-5 w-5 text-rose-200" />
              </div>
              <CounteredCardStack
                cardNames={counteredCards}
                isExpanded={isTargetStackExpanded}
                onToggleExpanded={() => setIsTargetStackExpanded((current) => !current)}
              />
            </>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={IMPACT_STYLES[pairing.impact]}>{pairing.impact} impact</Badge>
              {selectedCounterCards.map((card) => (
                <Badge key={card.id} className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">{card.category}</Badge>
              ))}
              {pairing.tags.map((tag) => (
                <Badge key={tag} className="border-border/60 bg-secondary/45 text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={isEditing ? 'Close pairing editor' : 'Edit pairing'}
                title={isEditing ? 'Close editor' : 'Edit pairing'}
              >
                {isEditing ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onDeletePairing(pairing.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/25 bg-rose-300/10 text-rose-200 transition-colors hover:bg-rose-300/15"
                aria-label="Delete counter matchup"
                title="Delete matchup"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/[0.06] p-3">
              <CounterCardSelector
                selectedIds={counterCardIds}
                counterCards={counterCards}
                onChange={(counterCardIds) => onUpdatePairing(pairing.id, { counterCardIds })}
                onCreateCounterCard={onCreateCounterCard}
                onUpdateCounterCard={onUpdateCounterCard}
                onDeleteCounterCard={onDeleteCounterCard}
              />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <div>
                  <span className="mb-1 block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Countered cards</span>
                  <CounteredCardSelector
                    selectedCards={counteredCards}
                    knownCards={knownCounteredCards}
                    onChange={updateCounteredCards}
                  />
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Impact</span>
                  <select
                    value={pairing.impact}
                    onChange={(event) => onUpdatePairing(pairing.id, { impact: event.target.value as ImpactRating })}
                    className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {IMPACT_RATINGS.map((impact) => <option key={impact} value={impact}>{impact}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
                <textarea
                  value={pairing.summary}
                  onChange={(event) => onUpdatePairing(pairing.id, { summary: event.target.value })}
                  className="min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Timing</span>
                <textarea
                  value={pairing.timing}
                  onChange={(event) => onUpdatePairing(pairing.id, { timing: event.target.value })}
                  className="min-h-16 w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Tags</span>
                <input
                  value={pairing.tags.join(', ')}
                  onChange={(event) => updateTags(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>
          ) : (
            <div>
              <h3 className="flex flex-wrap items-center gap-1.5 font-display text-base font-semibold text-foreground">
                {selectedCounterCards.length > 0 ? selectedCounterCards.map((card, index) => (
                  <MatchupCardName key={card.id} name={card.name} toneIndex={index} />
                )) : (
                  <span>Counter cards</span>
                )}
                {hasCounteredCards ? (
                  <>
                    <span className="px-1 text-muted-foreground">into</span>
                    {counteredCards.map((cardName, index) => (
                      <MatchupCardName key={`${cardName}-${index}`} name={cardName} toneIndex={selectedCounterCards.length + index} />
                    ))}
                  </>
                ) : (
                  <span className="px-1 text-muted-foreground">activation</span>
                )}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{pairing.summary}</p>
              <div className="mt-3 rounded-md border border-sky-300/30 bg-sky-300/10 px-3.5 py-3 text-sm leading-6 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.04)]">
                <span className="font-display font-semibold text-sky-100">Timing:</span> {pairing.timing}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-md border border-border/45 bg-background/25 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-display font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Matchup Comments
              </span>
              <span className="text-[11px] text-muted-foreground">{comments.length} saved</span>
            </div>

            {comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border/40 bg-secondary/35 p-2">
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          className="min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveEditingComment}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 text-xs font-display font-semibold text-emerald-100 transition-colors hover:bg-emerald-300/15"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <p className="min-w-0 flex-1 text-sm leading-5 text-slate-200">{comment.text}</p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingComment(comment)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Edit comment"
                            title="Edit comment"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteComment(comment.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/25 bg-rose-300/10 text-rose-200 transition-colors hover:bg-rose-300/15"
                            aria-label="Delete comment"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addComment();
                }}
                placeholder="Add timing note or local testing result"
                className="min-w-0 flex-1 rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={addComment}
                disabled={!draft.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 text-xs font-display font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DeckSearchPanel({
  decks,
  selectedDeck,
  query,
  tierFilter,
  onQueryChange,
  onTierFilterChange,
  onSelectDeck,
  onAddDeck,
  onCollapse,
}: {
  decks: CounterDeck[];
  selectedDeck?: CounterDeck;
  query: string;
  tierFilter: FilterValue<DeckTier>;
  onQueryChange: (query: string) => void;
  onTierFilterChange: (tier: FilterValue<DeckTier>) => void;
  onSelectDeck: (deckId: string) => void;
  onAddDeck: () => void;
  onCollapse: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = decks
    .filter((deck) => query.trim() && normalizeSearch(`${deck.name} ${deck.tier} ${getDeckTag(deck)}`).includes(normalizeSearch(query)))
    .slice(0, 5);

  return (
    <aside className="min-w-0 self-start rounded-xl border border-border/55 bg-card/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Deck Search</h2>
        <div className="flex items-center gap-2">
          <Badge className="border-border/60 bg-secondary/45 text-muted-foreground">{decks.length}</Badge>
          <button
            type="button"
            onClick={onAddDeck}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary transition-colors hover:bg-primary/20"
            aria-label="Add deck"
            title="Add deck"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Collapse deck search"
            title="Collapse deck search"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
            placeholder="Find a deck or archetype"
            className="h-11 w-full rounded-md border border-border bg-background/65 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40"
          />
        </label>
        {isFocused && suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-40 overflow-hidden rounded-md border border-border/70 bg-background/95 shadow-2xl backdrop-blur">
            {suggestions.map((deck) => (
              <button
                key={deck.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelectDeck(deck.id);
                  onQueryChange(deck.name);
                  setIsFocused(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
              >
                <DeckThumbnail deck={deck} className="h-8 w-8 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-display font-semibold text-foreground">{deck.name}</span>
                <Badge className={TIER_STYLES[deck.tier]}>{deck.tier}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="relative mt-3 block">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={tierFilter}
          onChange={(event) => onTierFilterChange(event.target.value as FilterValue<DeckTier>)}
          className="h-10 w-full appearance-none rounded-md border border-border bg-background/65 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All tiers</option>
          {DECK_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
        </select>
      </label>

      <div
        role="region"
        aria-label="Deck search results"
        tabIndex={0}
        className="deck-search-scroll mt-3 max-h-[clamp(220px,calc(100dvh-320px),680px)] space-y-2 overflow-y-auto rounded-lg border-y border-border/30 py-2 pl-1 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {decks.map((deck) => (
          <button
            key={deck.id}
            type="button"
            onClick={() => onSelectDeck(deck.id)}
            aria-pressed={selectedDeck?.id === deck.id}
            className={cn(
              'grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60',
              selectedDeck?.id === deck.id
                ? 'border-primary/45 bg-primary/12 shadow-sm shadow-primary/10'
                : 'border-transparent bg-secondary/25 hover:border-border/60 hover:bg-secondary/55',
            )}
          >
            <DeckThumbnail deck={deck} className="h-10 w-10 text-sm" />
            <span className="min-w-0 truncate font-display text-base font-semibold text-foreground">{deck.name}</span>
            <Badge className={TIER_STYLES[deck.tier]}>{deck.tier}</Badge>
          </button>
        ))}
        {decks.length === 0 && (
          <div className="rounded-md border border-border/45 bg-secondary/35 p-4 text-sm text-muted-foreground">
            No decks match the current search and filters.
          </div>
        )}
      </div>
    </aside>
  );
}

export function DeckCounterGuide() {
  const [guideData, setGuideData] = useState<CounterGuideData>(getCounterGuideData);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<FilterValue<DeckTier>>('all');
  const [impactFilter, setImpactFilter] = useState<FilterValue<ImpactRating>>('all');
  const [counterFilter, setCounterFilter] = useState('all');
  const [isCounterManagerOpen, setIsCounterManagerOpen] = useState(false);
  const [counterManagerQuery, setCounterManagerQuery] = useState('');
  const [comments, setComments] = useState<CounterComment[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => [...guideData.decks].sort(compareDecksByTier)[0]?.id ?? '');
  const [isDeckEditing, setIsDeckEditing] = useState(false);
  const [activeEndboardSlot, setActiveEndboardSlot] = useState<EndboardSlotId | null>(null);
  const [endboardSearchQuery, setEndboardSearchQuery] = useState('');
  const [endboardSearchResults, setEndboardSearchResults] = useState<YgoSearchCard[]>([]);
  const [isEndboardSearching, setIsEndboardSearching] = useState(false);
  const [isDeckSearchOpen, setIsDeckSearchOpen] = useState(true);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(true);
  const isDeckFocused = !isDeckSearchOpen && !isStatisticsOpen;
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [statisticsCardId, setStatisticsCardId] = useState<string | null>(null);
  const statisticsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setComments(getCounterComments());
  }, []);

  const { decks, counterCards, pairings } = guideData;
  const deckToDelete = decks.find((deck) => deck.id === deleteDeckId);
  const statistics = useMemo(() => calculateHandtrapStatistics(decks, counterCards, pairings), [counterCards, decks, pairings]);
  const deleteCard = counterCards.find((card) => card.id === deleteCardId);
  const affectedPairings = pairings.filter((pairing) => getPairingCounterCardIds(pairing).includes(deleteCardId ?? ''));
  const statisticsCard = counterCards.find((card) => card.id === statisticsCardId);
  const statisticsMatchups = decks.flatMap((deck) => {
    const matches = pairings.filter((pairing) => pairing.deckId === deck.id && getPairingCounterCardIds(pairing).includes(statisticsCardId ?? ''));
    return matches.length ? [{ deck, matches }] : [];
  });

  const filteredDecks = useMemo(() => decks
    .filter((deck) => {
      if (tierFilter !== 'all' && deck.tier !== tierFilter) return false;
      return doesDeckMatchQuery(deck, getPairingsForDeck(deck.id, pairings), counterCards, query);
    })
    .sort(compareDecksByTier), [counterCards, decks, pairings, query, tierFilter]);

  useEffect(() => {
    if (filteredDecks.length === 0) return;
    if (!filteredDecks.some((deck) => deck.id === selectedDeckId)) {
      setSelectedDeckId(filteredDecks[0].id);
    }
  }, [filteredDecks, selectedDeckId]);

  const selectedDeck = getDeckById(decks, selectedDeckId) || filteredDecks[0] || decks[0];
  const selectedEndboardSlots = selectedDeck ? deckToEndboardSlots(selectedDeck) : {};
  const selectedPairings = selectedDeck ? getPairingsForDeck(selectedDeck.id, pairings).filter((pairing) => {
    if (impactFilter !== 'all' && pairing.impact !== impactFilter) return false;
    if (counterFilter !== 'all' && !getPairingCounterCardIds(pairing).includes(counterFilter)) return false;
    return true;
  }).sort((a, b) => IMPACT_RATINGS.indexOf(a.impact) - IMPACT_RATINGS.indexOf(b.impact)) : [];

  const availableCounterCards = useMemo(() => {
    const ids = new Set(counterCards.map((card) => card.id));
    return counterCards.filter((card) => ids.has(card.id));
  }, [counterCards]);

  const knownEndboardCards = useMemo(() => {
    if (!selectedDeck) return [];

    return Array.from(new Set([
      ...flattenEndboardSlots(deckToEndboardSlots(selectedDeck)),
      ...getPairingsForDeck(selectedDeck.id, pairings).flatMap((pairing) => [
        ...getPairingCounteredCards(pairing),
        ...getPairingCounterCardIds(pairing).map((id) => getCounterCardById(id, counterCards)?.name || ''),
      ]),
    ].filter(Boolean)));
  }, [counterCards, pairings, selectedDeck]);

  const knownCounteredCards = useMemo(() => {
    if (!selectedDeck) return [];

    return Array.from(new Set([
      ...flattenEndboardSlots(deckToEndboardSlots(selectedDeck)),
      ...getPairingsForDeck(selectedDeck.id, pairings).flatMap(getPairingCounteredCards),
    ].filter(Boolean)));
  }, [pairings, selectedDeck]);

  const commentsByPairing = useMemo(() => {
    return comments.reduce<Record<string, CounterComment[]>>((grouped, comment) => {
      grouped[comment.pairingId] = grouped[comment.pairingId] || [];
      grouped[comment.pairingId].push(comment);
      return grouped;
    }, {});
  }, [comments]);

  useEffect(() => {
    if (!activeEndboardSlot || endboardSearchQuery.trim().length < 2) {
      setEndboardSearchResults([]);
      setIsEndboardSearching(false);
      return;
    }

    let cancelled = false;
    setIsEndboardSearching(true);
    const timeout = window.setTimeout(async () => {
      const results = await searchYgoCards(endboardSearchQuery);
      if (cancelled) return;
      setEndboardSearchResults(results);
      setIsEndboardSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeEndboardSlot, endboardSearchQuery]);

  const commitGuideData = (createNextData: (current: CounterGuideData) => CounterGuideData) => {
    setGuideData((current) => saveCounterGuideData(createNextData(current)));
  };

  const updateDeck = (deckId: string, updates: Partial<CounterDeck>) => {
    commitGuideData((current) => ({
      ...current,
      decks: current.decks.map((deck) => deck.id === deckId ? { ...deck, ...updates } : deck),
    }));
  };

  const deleteDeck = (deckId: string) => {
    const pairingIds = new Set(pairings.filter((pairing) => pairing.deckId === deckId).map((pairing) => pairing.id));
    commitGuideData((current) => ({
      ...current,
      decks: current.decks.filter((deck) => deck.id !== deckId),
      pairings: current.pairings.filter((pairing) => pairing.deckId !== deckId),
    }));
    setComments(saveCounterComments(comments.filter((comment) => !pairingIds.has(comment.pairingId))));
    setDeleteDeckId(null);
    setIsDeckEditing(false);
    closeEndboardSearch();
  };

  const addDeck = () => {
    const id = createUniqueId('New Deck', 'deck', decks.map((deck) => deck.id));

    commitGuideData((current) => ({
      ...current,
      decks: [
        ...current.decks,
        {
          id,
          name: 'New Deck',
          tier: 'Rogue',
          endboard: [],
          plan: 'Add the deck game plan here.',
        },
      ],
    }));
    setSelectedDeckId(id);
    setQuery('');
    setTierFilter('all');
    setIsDeckEditing(true);
    closeEndboardSearch();
  };

  const updateSelectedDeckSlots = (update: (current: EndboardSlots) => EndboardSlots) => {
    if (!selectedDeck) return;
    const deckId = selectedDeck.id;
    commitGuideData((current) => ({
      ...current,
      decks: current.decks.map((deck) => {
        if (deck.id !== deckId) return deck;
        const slots = update(deckToEndboardSlots(deck));
        return {
          ...deck,
          endboardSlots: serializeEndboardSlots(slots),
          endboard: flattenEndboardSlots(slots),
        };
      }),
    }));
  };

  const closeEndboardSearch = () => {
    setActiveEndboardSlot(null);
    setEndboardSearchQuery('');
    setEndboardSearchResults([]);
    setIsEndboardSearching(false);
  };

  const handleSelectEndboardCard = (cardName: string) => {
    if (!activeEndboardSlot || !selectedDeck) return;
    const slotId = activeEndboardSlot;
    updateSelectedDeckSlots((currentSlots) => ({
      ...currentSlots,
      [slotId]: [...(currentSlots[slotId] || []), cardName],
    }));
    closeEndboardSearch();
  };

  const handleRemoveEndboardCard = (slotId: EndboardSlotId) => {
    if (!selectedDeck) return;
    updateSelectedDeckSlots((currentSlots) => {
      const nextSlots = { ...currentSlots };
      const remainingCards = (nextSlots[slotId] || []).slice(0, -1);
      if (remainingCards.length > 0) {
        nextSlots[slotId] = remainingCards;
      } else {
        delete nextSlots[slotId];
      }
      return nextSlots;
    });
  };

  const handleMoveEndboardCard = (sourceSlotId: EndboardSlotId, targetSlotId: EndboardSlotId) => {
    if (!selectedDeck || sourceSlotId === targetSlotId) return;
    updateSelectedDeckSlots((currentSlots) => {
      const sourceCards = currentSlots[sourceSlotId];
      if (!sourceCards?.length) return currentSlots;

      const targetCards = currentSlots[targetSlotId];
      const nextSlots = { ...currentSlots, [targetSlotId]: sourceCards };
      if (targetCards?.length) {
        nextSlots[sourceSlotId] = targetCards;
      } else {
        delete nextSlots[sourceSlotId];
      }
      return nextSlots;
    });
  };

  const handleSetEndboardSlotCards = (slotId: EndboardSlotId, cards: string[]) => {
    if (!selectedDeck) return;
    updateSelectedDeckSlots((currentSlots) => {
      const nextSlots = { ...currentSlots };
      if (cards.length > 0) {
        nextSlots[slotId] = cards;
      } else {
        delete nextSlots[slotId];
      }
      return nextSlots;
    });
  };

  const handleEndboardCardNoteChange = (cardInstanceId: string, text: string) => {
    if (!selectedDeck) return;

    const nextCardNotes = { ...(selectedDeck.cardNotes || {}) };
    if (text.trim()) {
      nextCardNotes[cardInstanceId] = text;
    } else {
      delete nextCardNotes[cardInstanceId];
    }

    updateDeck(selectedDeck.id, {
      cardNotes: Object.keys(nextCardNotes).length > 0 ? nextCardNotes : undefined,
    });
  };

  const updatePairing = (pairingId: string, updates: Partial<CounterPairing>) => {
    commitGuideData((current) => ({
      ...current,
      pairings: current.pairings.map((pairing) => pairing.id === pairingId ? { ...pairing, ...updates } : pairing),
    }));
  };

  const addPairing = () => {
    if (!selectedDeck) return;
    const id = createUniqueId(`${selectedDeck.id}-counter`, 'pairing', pairings.map((pairing) => pairing.id));

    commitGuideData((current) => ({
      ...current,
      pairings: [
        ...current.pairings,
        {
          id,
          deckId: selectedDeck.id,
          counterCardIds: [],
          counteredCard: selectedDeck.endboard[0] || '',
          counteredCards: selectedDeck.endboard[0] ? [selectedDeck.endboard[0]] : [],
          impact: 'Medium',
          summary: 'Add the matchup summary here.',
          timing: 'Add the timing window here.',
          tags: ['custom'],
        },
      ],
    }));
  };

  const deletePairing = (pairingId: string) => {
    commitGuideData((current) => ({
      ...current,
      pairings: current.pairings.filter((pairing) => pairing.id !== pairingId),
    }));
    setComments(saveCounterComments(comments.filter((comment) => comment.pairingId !== pairingId)));
  };

  const createCounterCard = (card: CounterCard) => {
    commitGuideData((current) => ({
      ...current,
      counterCards: current.counterCards.some((existingCard) => existingCard.id === card.id)
        ? current.counterCards
        : [...current.counterCards, card],
    }));
  };

  const deleteCounterCard = (counterCardId: string) => {
    commitGuideData((current) => ({
      ...current,
      counterCards: current.counterCards.filter((card) => card.id !== counterCardId),
      pairings: current.pairings.map((pairing) => getPairingCounterCardIds(pairing).includes(counterCardId) ? {
        ...pairing,
        counterCardId: undefined,
        counterCardIds: getPairingCounterCardIds(pairing).filter((id) => id !== counterCardId),
      } : pairing),
    }));
    setDeleteCardId(null);
    setCounterFilter((current) => current === counterCardId ? 'all' : current);
  };

  const renameSavedCounter = (counterCardId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    commitGuideData((current) => ({
      ...current,
      counterCards: current.counterCards.map((card) => card.id === counterCardId ? { ...card, name: trimmedName } : card),
    }));
  };

  const requestDeleteCounterCard = (counterCardId: string) => {
    if (pairings.some((pairing) => getPairingCounterCardIds(pairing).includes(counterCardId))) {
      setDeleteCardId(counterCardId);
    } else {
      deleteCounterCard(counterCardId);
    }
  };

  const updateCounterCard = (pairingId: string, counterCardId: string, updates: Partial<CounterCard>) => {
    commitGuideData((current) => {
      const original = current.counterCards.find((card) => card.id === counterCardId);
      if (!original) return current;
      const name = (updates.name ?? original.name).trim();
      const category = updates.category ?? original.category;
      const existing = current.counterCards.find((card) => normalizeSearch(card.name) === normalizeSearch(name) && card.category === category);
      const replacement = name ? existing ?? {
        id: createUniqueId(name, 'counter-card', current.counterCards.map((card) => card.id)),
        name,
        category,
      } : undefined;
      return {
        ...current,
        counterCards: replacement && !existing ? [...current.counterCards, replacement] : current.counterCards,
        pairings: current.pairings.map((pairing) => pairing.id !== pairingId ? pairing : {
          ...pairing,
          counterCardId: undefined,
          counterCardIds: Array.from(new Set(getPairingCounterCardIds(pairing).flatMap((id) =>
            id === counterCardId ? replacement ? [replacement.id] : [] : [id],
          ))),
        }),
      };
    });
  };

  const addComment = (pairingId: string, text: string) => {
    const now = Date.now();
    const next = saveCounterComments([
      ...comments,
      {
        id: createCommentId(),
        pairingId,
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setComments(next);
  };

  const updateComment = (commentId: string, text: string) => {
    const trimmed = text.trim();
    const next = trimmed
      ? comments.map((comment) => comment.id === commentId ? { ...comment, text: trimmed, updatedAt: Date.now() } : comment)
      : comments.filter((comment) => comment.id !== commentId);
    setComments(saveCounterComments(next));
  };

  const deleteComment = (commentId: string) => {
    setComments(saveCounterComments(comments.filter((comment) => comment.id !== commentId)));
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="shapegrid-canvas" />
      </div>
      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pt-6 pb-24 md:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/60 bg-secondary/60 px-3 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Combos
              </Link>
              <Badge className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100">Endboard Breaker Lab</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
              Deck Counters
            </h1>
          </div>
          <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-md border border-border/55 bg-background/35 p-2">
            <div className="text-center">
              <div className="font-display text-lg font-semibold text-foreground">{decks.length}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Decks</div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg font-semibold text-foreground">{counterCards.length}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Counters</div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg font-semibold text-foreground">{comments.length}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</div>
            </div>
          </div>
        </div>

        <section className="mb-5 grid gap-3 rounded-lg border border-border/55 bg-card/70 p-3 backdrop-blur md:grid-cols-[180px_220px_auto]">
          <label className="block">
            <select
              value={impactFilter}
              onChange={(event) => setImpactFilter(event.target.value as FilterValue<ImpactRating>)}
              className="h-11 w-full rounded-md border border-border bg-background/65 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All impacts</option>
              {IMPACT_RATINGS.map((impact) => <option key={impact} value={impact}>{impact}</option>)}
            </select>
          </label>
          <label className="block">
            <select
              value={counterFilter}
              onChange={(event) => setCounterFilter(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-background/65 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All counters</option>
              {availableCounterCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCounterManagerOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-secondary/60 px-3 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <Settings2 className="h-4 w-4" />
              Manage Counters
            </button>
          </div>
        </section>

        <div
          className={cn(
            'grid gap-5',
            isDeckSearchOpen && isStatisticsOpen && 'xl:grid-cols-[330px_minmax(0,1fr)_360px]',
            isDeckSearchOpen && !isStatisticsOpen && 'xl:grid-cols-[330px_minmax(0,1fr)_56px]',
            !isDeckSearchOpen && isStatisticsOpen && 'xl:grid-cols-[56px_minmax(0,1fr)_360px]',
            !isDeckSearchOpen && !isStatisticsOpen && 'xl:grid-cols-[56px_minmax(0,1fr)_56px]',
          )}
        >
          {isDeckSearchOpen ? (
            <DeckSearchPanel
              decks={filteredDecks}
              selectedDeck={selectedDeck}
              query={query}
              tierFilter={tierFilter}
              onQueryChange={setQuery}
              onTierFilterChange={setTierFilter}
              onSelectDeck={(deckId) => {
                setSelectedDeckId(deckId);
                closeEndboardSearch();
              }}
              onAddDeck={addDeck}
              onCollapse={() => setIsDeckSearchOpen(false)}
            />
          ) : (
            <aside className="flex min-h-14 items-start justify-center rounded-lg border border-border/55 bg-card/70 p-2 backdrop-blur">
              <button
                type="button"
                onClick={() => setIsDeckSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Expand deck search"
                title="Expand deck search"
              >
                <Search className="h-4 w-4" />
              </button>
            </aside>
          )}

          <section className="min-w-0 rounded-lg border border-border/55 bg-card/70 p-4 backdrop-blur">
            {selectedDeck && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isDeckEditing ? (
                        <input
                          value={selectedDeck.name}
                          onChange={(event) => updateDeck(selectedDeck.id, { name: event.target.value })}
                          className="h-11 min-w-[240px] rounded-md border border-border bg-background/60 px-3 font-display text-xl font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      ) : (
                        <h2 className="font-display text-2xl font-semibold text-foreground">{selectedDeck.name}</h2>
                      )}
                      <Badge className={TIER_STYLES[selectedDeck.tier]}>{selectedDeck.tier}</Badge>
                    </div>
                    {isDeckEditing ? (
                      <div className="mt-3 max-w-2xl space-y-3">
                        <label className="block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                          Thumbnail card
                          <input
                            value={selectedDeck.thumbnailCardName || ''}
                            onChange={(event) => updateDeck(selectedDeck.id, { thumbnailCardName: event.target.value })}
                            placeholder="Card name for miniature"
                            className="mt-1 h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground/55 focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <textarea
                          value={selectedDeck.plan}
                          onChange={(event) => updateDeck(selectedDeck.id, { plan: event.target.value })}
                          className="min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    ) : (
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{selectedDeck.plan}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Tier
                      <select
                        value={selectedDeck.tier}
                        onChange={(event) => updateDeck(selectedDeck.id, { tier: event.target.value as DeckTier })}
                        className="h-9 rounded-md border border-border bg-background/65 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {DECK_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDeckEditing((current) => !current)}
                      aria-label={isDeckEditing ? 'Done' : 'Edit Deck'}
                      title={isDeckEditing ? 'Done' : 'Edit Deck'}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {isDeckEditing ? <Save className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDeckId(selectedDeck.id)}
                      aria-label="Delete Deck"
                      title="Delete Deck"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 border-y border-border/45 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-200" />
                    <h3 className="font-display text-base font-semibold text-foreground">Typical Endboard</h3>
                  </div>
                  <EndboardBuilder
                    slots={selectedEndboardSlots}
                    knownCards={knownEndboardCards}
                    activeSlot={activeEndboardSlot}
                    searchQuery={endboardSearchQuery}
                    searchResults={endboardSearchResults}
                    isSearching={isEndboardSearching}
                    onOpenSearch={setActiveEndboardSlot}
                    onCloseSearch={closeEndboardSearch}
                    onSearchQueryChange={setEndboardSearchQuery}
                    onSelectCard={handleSelectEndboardCard}
                    onRemoveCard={handleRemoveEndboardCard}
                    onMoveCard={handleMoveEndboardCard}
                    onSetSlotCards={handleSetEndboardSlotCards}
                    cardNotes={selectedDeck.cardNotes}
                    getCardNoteId={(slotId, cardIndex) => `endboard:${slotId}:${cardIndex}`}
                    onCardNoteChange={handleEndboardCardNoteChange}
                  />
                </div>

                <div className="mt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <h3 className="font-display text-base font-semibold text-foreground">Counters And Break Points</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-border/60 bg-secondary/45 text-muted-foreground">
                        {selectedPairings.length} shown
                      </Badge>
                      <button
                        type="button"
                        onClick={addPairing}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-3 text-xs font-display font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        <Plus className="h-4 w-4" />
                        Add Counter
                      </button>
                    </div>
                  </div>
                  {selectedPairings.map((pairing) => (
                    <CounterMatchup
                      key={pairing.id}
                      pairing={pairing}
                      counterCards={counterCards}
                      knownCounteredCards={knownCounteredCards}
                      comments={commentsByPairing[pairing.id] || []}
                      onUpdatePairing={updatePairing}
                      onDeletePairing={deletePairing}
                      onCreateCounterCard={createCounterCard}
                      onDeleteCounterCard={requestDeleteCounterCard}
                      onUpdateCounterCard={(cardId, updates) => updateCounterCard(pairing.id, cardId, updates)}
                      onAddComment={addComment}
                      onUpdateComment={updateComment}
                      onDeleteComment={deleteComment}
                    />
                  ))}
                  {selectedPairings.length === 0 && (
                    <div className="rounded-md border border-border/45 bg-secondary/35 p-4 text-sm text-muted-foreground">
                      No counters match the current impact and handtrap filters for this deck.
                    </div>
                  )}
                </div>
              </>
            )}
            {!selectedDeck && (
              <p className="p-4 text-sm text-muted-foreground">No decks yet. Add a deck to start building your counter guide.</p>
            )}
          </section>

          {isStatisticsOpen ? (
            <aside className="min-w-0 rounded-lg border border-border/55 bg-card/70 p-4 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <BarChart3 className="h-5 w-5 shrink-0 text-emerald-200" />
                  <h2 className="min-w-0 truncate font-display text-lg font-semibold text-foreground">Handtrap Statistics</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatisticsOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Collapse handtrap statistics"
                  title="Collapse handtrap statistics"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {statistics.map((stat) => (
                  <article key={stat.counterCard.id} className="rounded-md border border-border/45 bg-secondary/35 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold leading-5 text-foreground">
                          <button
                            type="button"
                            onClick={(event) => {
                              statisticsTriggerRef.current = event.currentTarget;
                              setStatisticsCardId(stat.counterCard.id);
                            }}
                            aria-haspopup="dialog"
                            aria-label={`View matchups for ${stat.counterCard.name}`}
                            className="rounded-sm text-left underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                          >
                            {stat.counterCard.name}
                          </button>
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">{stat.summary}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-xl font-semibold text-emerald-100">{stat.weightedScore}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md border border-border/35 bg-background/35 p-2">
                        <div className="font-display text-base font-semibold text-foreground">{stat.totalDecks}</div>
                        <div className="text-[10px] text-muted-foreground">Decks</div>
                      </div>
                      <div className="rounded-md border border-emerald-300/25 bg-emerald-300/10 p-2">
                        <div className="font-display text-base font-semibold text-emerald-100">{stat.highImpactCount}</div>
                        <div className="text-[10px] text-emerald-100/70">High</div>
                      </div>
                      <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-2">
                        <div className="font-display text-base font-semibold text-amber-100">{stat.mediumImpactCount}</div>
                        <div className="text-[10px] text-amber-100/70">Medium</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {DECK_TIERS.map((tier) => (
                        <Badge key={tier} className={cn(TIER_STYLES[tier], stat.tierCounts[tier] === 0 && 'opacity-35')}>
                          {tier.replace(' Tier', '')}: {stat.tierCounts[tier]}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          ) : (
            <aside className="flex min-h-14 items-start justify-center rounded-lg border border-border/55 bg-card/70 p-2 backdrop-blur">
              <button
                type="button"
                onClick={() => setIsStatisticsOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Expand handtrap statistics"
                title="Expand handtrap statistics"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </aside>
          )}
        </div>
      </main>
      <button
        type="button"
        onClick={() => {
          setIsDeckSearchOpen(isDeckFocused);
          setIsStatisticsOpen(isDeckFocused);
        }}
        aria-pressed={isDeckFocused}
        title={isDeckFocused ? 'Expand Deck Search and Handtrap Statistics' : 'Collapse Deck Search and Handtrap Statistics'}
        className={cn(
          'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm shadow-lg backdrop-blur-md transition-colors md:right-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isDeckFocused
            ? 'border-primary/50 bg-background/95 text-primary hover:bg-secondary'
            : 'border-border bg-background/95 text-foreground hover:bg-secondary',
        )}
      >
        {isDeckFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {isDeckFocused ? 'Show side panels' : 'Focus deck'}
      </button>
      <Dialog open={isCounterManagerOpen} onOpenChange={setIsCounterManagerOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Manage Counters</DialogTitle>
          <DialogDescription>
            Rename saved counters across all matchups. Names save when you press Enter or leave the field. Deleting a counter removes it from the saved list and its matchups.
          </DialogDescription>
          <input
            aria-label="Search saved counters"
            placeholder="Search saved counters..."
            value={counterManagerQuery}
            onChange={(event) => setCounterManagerQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="space-y-2">
            {counterCards.filter((card) => normalizeSearch(`${card.name} ${card.category}`).includes(normalizeSearch(counterManagerQuery))).map((card) => (
              <div key={card.id} className="rounded-md border border-border/45 bg-secondary/35 p-3">
                <div className="flex items-center gap-2">
                  <div className="grid min-w-0 flex-1">
                    <CardNameDraft
                      value={card.name}
                      label={`Saved counter name: ${card.name}`}
                      onCommit={(name) => renameSavedCounter(card.id, name)}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete saved counter ${card.name}`}
                    title="Delete saved counter"
                    onClick={() => requestDeleteCounterCard(card.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-300/25 bg-rose-300/10 text-rose-200 hover:bg-rose-300/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {card.category} · Used in {pairings.filter((pairing) => getPairingCounterCardIds(pairing).includes(card.id)).length} matchups
                </p>
              </div>
            ))}
            {!counterCards.some((card) => normalizeSearch(`${card.name} ${card.category}`).includes(normalizeSearch(counterManagerQuery))) && (
              <p className="py-4 text-sm text-muted-foreground">No saved counters match your search.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deckToDelete)} onOpenChange={(open) => { if (!open) setDeleteDeckId(null); }}>
        <DialogContent>
          <DialogTitle>Delete {deckToDelete?.name}?</DialogTitle>
          <DialogDescription>
            This will permanently delete this deck, its matchup guidance, and associated comments. Saved counter cards will remain available.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteDeckId(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => { if (deleteDeckId) deleteDeck(deleteDeckId); }} className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground">Delete deck</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteCard)} onOpenChange={(open) => { if (!open) setDeleteCardId(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Delete {deleteCard?.name}?</DialogTitle>
          <DialogDescription>
            This removes the saved suggestion and detaches it from {affectedPairings.length} matchups. The matchups, other cards, and notes will remain.
          </DialogDescription>
          <ul className="space-y-2 text-sm">
            {affectedPairings.map((pairing) => (
              <li key={pairing.id} className="rounded-md border border-border/50 p-2">
                <span className="font-semibold">{decks.find((deck) => deck.id === pairing.deckId)?.name || pairing.deckId}</span>
                <p className="text-muted-foreground">{pairing.summary || getPairingCounteredCards(pairing).join(', ') || 'Untitled matchup'}</p>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteCardId(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => { if (deleteCardId) deleteCounterCard(deleteCardId); }} className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground">Delete saved card</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(statisticsCard)} onOpenChange={(open) => { if (!open) setStatisticsCardId(null); }}>
        <DialogContent
          className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            statisticsTriggerRef.current?.focus();
          }}
        >
          <DialogTitle className="pr-6">{statisticsCard?.name} matchups</DialogTitle>
          <DialogDescription>
            {statisticsMatchups.length} decks with saved matchup guidance. Includes all impact levels and decks, regardless of the current filters.
          </DialogDescription>
          <div className="space-y-4">
            {statisticsMatchups.length === 0 && (
              <p className="text-sm text-muted-foreground">No matchup guidance saved for this handtrap yet.</p>
            )}
            {statisticsMatchups.map(({ deck, matches }) => (
              <section key={deck.id} aria-label={`${deck.name} matchups`} className="rounded-lg border border-border/55 bg-secondary/20 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{deck.name}</h3>
                  <Badge className={TIER_STYLES[deck.tier]}>{deck.tier}</Badge>
                </div>
                <div className="space-y-3">
                  {matches.map((pairing) => {
                    const targets = getPairingCounteredCards(pairing);
                    const matchupCards = getPairingCounterCardIds(pairing)
                      .flatMap((id) => counterCards.find((card) => card.id === id) ?? [])
                      .sort((a, b) => Number(b.id === statisticsCardId) - Number(a.id === statisticsCardId));
                    const partners = getPairingCounterCardIds(pairing)
                      .filter((id) => id !== statisticsCardId)
                      .flatMap((id) => counterCards.find((card) => card.id === id)?.name ?? []);
                    return (
                      <article key={pairing.id} className="space-y-2 rounded-md border border-border/40 bg-background/40 p-3 text-sm">
                        <StatisticsMatchupVisual key={statisticsCardId} cards={matchupCards} targets={targets} />
                        <Badge className={IMPACT_STYLES[pairing.impact]}>{pairing.impact} impact</Badge>
                        {partners.length > 0 && <p><span className="font-semibold">Used with:</span> {partners.join(', ')}</p>}
                        <p><span className="font-semibold">Key cards:</span> {targets.length ? targets.join(', ') : 'No specific card listed; follow the timing guidance.'}</p>
                        <p className="whitespace-pre-wrap break-words text-muted-foreground">{pairing.summary || 'No matchup summary saved yet.'}</p>
                        <p className="whitespace-pre-wrap break-words"><span className="font-semibold text-sky-100">When and how to use:</span> {pairing.timing || 'No timing guidance saved yet.'}</p>
                        {pairing.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{pairing.tags.map((tag, index) => <Badge key={`${tag}-${index}`}>{tag}</Badge>)}</div>}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
