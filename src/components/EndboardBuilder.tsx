import { getCardHudAnchor, type CardHudAnchor } from '@/lib/cardHud';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ChevronLeft, ChevronRight, Info, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCardImage, useRelatedCards } from '@/hooks/useCardImage';
import { cn } from '@/lib/utils';
import { CardHudCallout, CardInfoEditorPanel, type CardNoteMap } from './CardDisplay';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

import { ENDBOARD_SLOTS, ENDBOARD_HAND_SLOTS, ENDBOARD_SLOT_IDS, searchYgoCards,
  type EndboardSlotId, type EndboardSlots, type EndboardSlotConfig, type YgoSearchCard } from '@/lib/endboard';

const ENDBOARD_DRAG_DATA_TYPE = 'application/x-combo-endboard-slot';
const CARD_CYCLE_INTERVAL_MS = 2000;

function EndboardSlotCard({ name }: { name: string }) {
  const { data, isLoading } = useCardImage(name);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/50 p-2 text-center text-[10px] text-muted-foreground">
        {name}
      </div>
    );
  }

  return <img src={data.imageUrl} alt={data.name} className="h-full w-full object-cover" loading="lazy" />;
}

function EndboardCardPreview({
  cardName,
  cardInfo,
  onCardInfoChange,
  onOpenChange,
}: {
  cardName: string | null;
  cardInfo: string;
  onCardInfoChange?: (text: string) => void;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [previewCardName, setPreviewCardName] = useState(cardName || '');
  const [showRelatedCards, setShowRelatedCards] = useState(false);
  const [showCardInfoEditor, setShowCardInfoEditor] = useState(false);
  const { data, isLoading } = useCardImage(previewCardName);
  const {
    data: relatedCardsData,
    isLoading: areRelatedCardsLoading,
  } = useRelatedCards(data?.name || previewCardName, Boolean(cardName) && showRelatedCards);
  const cardLabel = data?.name || previewCardName || cardName || '';

  useEffect(() => {
    setPreviewCardName(cardName || '');
    setShowRelatedCards(false);
    setShowCardInfoEditor(false);
  }, [cardName]);

  return (
    <Dialog open={Boolean(cardName)} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black/95 p-3 sm:rounded-none sm:p-6">
        <DialogTitle className="sr-only">{cardLabel}</DialogTitle>
        <DialogDescription className="sr-only">Full screen preview for {cardLabel}</DialogDescription>
        <div className="flex h-full w-full items-stretch justify-center gap-4 overflow-hidden">
          <div className="relative flex min-w-0 flex-1 items-center justify-center">
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
              <button
                type="button"
                onClick={() => {
                  setShowCardInfoEditor((current) => !current);
                  setShowRelatedCards(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10 text-cyan-50 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-cyan-200/40 hover:bg-cyan-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/50"
                aria-label={showCardInfoEditor ? 'Hide card info' : 'Show card info'}
                title={showCardInfoEditor ? 'Hide card info' : 'Show card info'}
              >
                <Info className="h-5 w-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRelatedCards((current) => !current);
                  setShowCardInfoEditor(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
                title={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
              >
                <Plus className={cn('h-5 w-5 transition-transform duration-200', showRelatedCards && 'rotate-45')} strokeWidth={2.3} />
              </button>
            </div>
            {isLoading ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              </div>
            ) : data ? (
              <img
                src={data.imageUrl}
                alt={data.name}
                className="h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)]"
              />
            ) : (
              <div className="flex h-[min(calc(100dvh-2rem),720px)] w-[min(86vw,520px)] items-center justify-center rounded-[28px] border border-white/15 bg-white/5 p-8 text-center text-xl text-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[min(calc(100dvh-3rem),720px)]">
                {cardLabel}
              </div>
            )}
          </div>
          {showRelatedCards && (
            <aside className="flex h-full w-[min(34vw,360px)] min-w-[260px] flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md max-md:absolute max-md:inset-x-3 max-md:bottom-3 max-md:h-[42dvh] max-md:w-auto max-md:min-w-0">
              <div className="shrink-0 border-b border-white/10 pb-3">
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-white/45">Related cards</p>
                <p className="mt-1 line-clamp-2 text-sm font-display font-semibold text-white/90">
                  {relatedCardsData?.archetype || cardLabel}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                {areRelatedCardsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  </div>
                ) : relatedCardsData?.cards.length ? (
                  <div className="space-y-3">
                    {relatedCardsData.cards.map((card) => (
                      <button
                        type="button"
                        key={card.id}
                        onClick={() => setPreviewCardName(card.name)}
                        className={cn(
                          'group rounded-lg border bg-black/20 p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                          card.name === cardLabel ? 'border-white/45 bg-white/12' : 'border-white/10',
                        )}
                      >
                        <img
                          src={card.thumbnailUrl}
                          alt={card.name}
                          className="aspect-[0.686] w-full rounded-md object-cover"
                          loading="lazy"
                        />
                        <span className="mt-1.5 block line-clamp-2 text-[11px] font-body leading-tight text-white/75 group-hover:text-white">
                          {card.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 p-5 text-center text-sm text-white/60">
                    No related cards found for this card.
                  </div>
                )}
              </div>
            </aside>
          )}
          {showCardInfoEditor && (
            <CardInfoEditorPanel
              cardName={cardName || cardLabel}
              value={cardInfo}
              onChange={(text) => onCardInfoChange?.(text)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EndboardSlot({
  slot,
  cardNames,
  cardNotes = {},
  getCardNoteId,
  onPick,
  onPreview,
  onBrowse,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  slot: EndboardSlotConfig;
  cardNames: string[];
  cardNotes?: CardNoteMap;
  getCardNoteId?: (slotId: EndboardSlotId, cardIndex: number) => string;
  onPick: () => void;
  onPreview: (cardName: string, cardIndex: number) => void;
  onBrowse: () => void;
  onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const cardName = cardNames[cardNames.length - 1];
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const slotCardKey = cardNames.join('|');
  const activeCardName = cardNames[activeCardIndex] || cardName || '';
  const activeCardNoteId = getCardNoteId?.(slot.id, activeCardIndex);
  const activeCardInfo = activeCardNoteId ? cardNotes[activeCardNoteId]?.trim() || '' : '';
  const [isHudVisible, setIsHudVisible] = useState(false);
  const [hudAnchorRect, setHudAnchorRect] = useState<CardHudAnchor | null>(null);
  useEffect(() => {
    if (!isHudVisible) return;
    const hideOnScroll = () => setIsHudVisible(false);
    window.addEventListener('scroll', hideOnScroll, { capture: true, passive: true });
    window.addEventListener('resize', hideOnScroll);
    return () => {
      window.removeEventListener('scroll', hideOnScroll, true);
      window.removeEventListener('resize', hideOnScroll);
    };
  }, [isHudVisible]);

  const slotCardRef = useRef<HTMLDivElement>(null);
  const isFieldSlot = slot.variant === 'field';
  const isSpellSlot = slot.variant === 'spell';
  const isHandSlot = slot.variant === 'hand';
  const pickTimeoutRef = useRef<number | null>(null);

  const clearPickTimeout = () => {
    if (pickTimeoutRef.current === null) return;
    window.clearTimeout(pickTimeoutRef.current);
    pickTimeoutRef.current = null;
  };

  const handlePickClick = () => {
    if (!cardName) {
      onPick();
      return;
    }

    clearPickTimeout();
    pickTimeoutRef.current = window.setTimeout(() => {
      pickTimeoutRef.current = null;
      onPick();
    }, 220);
  };

  const handlePreview = () => {
    if (!activeCardName) return;

    clearPickTimeout();
    onPreview(activeCardName, activeCardIndex);
  };

  useEffect(() => clearPickTimeout, []);

  useEffect(() => {
    setActiveCardIndex(0);
  }, [slotCardKey]);

  useEffect(() => {
    if (cardNames.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveCardIndex((current) => (current + 1) % cardNames.length);
    }, CARD_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [cardNames.length, slotCardKey]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        slot.row === 1 && 'self-end',
      )}
      onMouseEnter={() => {
        setHudAnchorRect(slotCardRef.current ? getCardHudAnchor(slotCardRef.current.getBoundingClientRect()) : null);
        setIsHudVisible(true);
      }}
      onMouseLeave={() => setIsHudVisible(false)}
      style={{ gridColumn: slot.col, gridRow: slot.row }}
    >
      <div
        ref={slotCardRef}
        draggable={Boolean(cardName)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          'group relative aspect-[0.686] w-full max-w-[96px] overflow-hidden rounded-[3px] border bg-black/60 shadow-[0_0_24px_rgba(0,0,0,0.45)] transition-all',
          cardName && 'cursor-grab active:cursor-grabbing',
          isFieldSlot
            ? 'border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.12)]'
            : isSpellSlot
              ? 'border-blue-500/55 shadow-[0_0_18px_rgba(0,72,255,0.22)]'
              : isHandSlot
                ? 'border-amber-300/55 shadow-[0_0_18px_rgba(252,211,77,0.18)]'
              : 'border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.14)]',
        )}
      >
        <div className="absolute inset-[5px] border border-white/25" />
        <div className="absolute inset-x-[8px] top-[16%] border-t border-white/15" />
        <div className="absolute inset-x-[8px] bottom-[16%] border-t border-white/15" />
        {cardName ? (
          <>
            <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-black">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeCardName}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.015 }}
                  transition={{ duration: 0.42, ease: 'easeInOut' }}
                >
                  <EndboardSlotCard name={activeCardName} />
                </motion.div>
              </AnimatePresence>
              {cardNames.length > 1 && (
                <motion.div
                  key={`glare-${activeCardName}`}
                  aria-hidden="true"
                  data-endboard-slot-glare
                  className="pointer-events-none absolute inset-y-[-35%] w-[48%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
                  initial={{ left: '-65%', opacity: 0 }}
                  animate={{ left: '125%', opacity: [0, 0.8, 0] }}
                  transition={{ duration: 0.72, ease: 'easeInOut' }}
                />
              )}
            </div>
            {cardNames.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clearPickTimeout();
                  onBrowse();
                }}
                className="absolute bottom-1 left-1 z-40 rounded-full border border-white/25 bg-black/75 px-1.5 py-0.5 text-[10px] font-display font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label={`View all ${cardNames.length} cards in endboard slot`}
              >
                {cardNames.length} cards
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />
        )}
        <button
          type="button"
          onClick={handlePickClick}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handlePreview();
          }}
          className={cn(
            'absolute inset-0 z-30 flex items-center justify-center bg-black/10 text-white transition-all hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            cardName && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
          aria-label={cardName ? `Add another card to slot containing ${cardNames.length} card${cardNames.length === 1 ? '' : 's'}; double click ${activeCardName} for full art view` : 'Add card to endboard slot'}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/55 shadow-lg backdrop-blur">
            <Plus className="h-5 w-5" />
          </span>
        </button>
        {cardName && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="absolute right-1 top-1 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white opacity-0 shadow-lg backdrop-blur transition-all hover:bg-destructive/80 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Remove ${cardName} from endboard slot`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {cardName && activeCardInfo && isHudVisible && (
          <CardHudCallout anchorRect={hudAnchorRect} cardName={activeCardName} text={activeCardInfo} />
        )}
      </AnimatePresence>
    </div>
  );
}

export function EndboardBuilder({
  slots,
  knownCards,
  activeSlot,
  searchQuery,
  searchResults,
  isSearching,
  cardNotes = {},
  getCardNoteId,
  onCardNoteChange,
  onOpenSearch,
  onCloseSearch,
  onSearchQueryChange,
  onSelectCard,
  onRemoveCard,
  onMoveCard,
  onSetSlotCards,
}: {
  slots: EndboardSlots;
  knownCards: string[];
  activeSlot: EndboardSlotId | null;
  searchQuery: string;
  searchResults: YgoSearchCard[];
  isSearching: boolean;
  cardNotes?: CardNoteMap;
  getCardNoteId?: (slotId: EndboardSlotId, cardIndex: number) => string;
  onCardNoteChange?: (cardInstanceId: string, text: string) => void;
  onOpenSearch: (slotId: EndboardSlotId) => void;
  onCloseSearch: () => void;
  onSearchQueryChange: (query: string) => void;
  onSelectCard: (cardName: string) => void;
  onRemoveCard: (slotId: EndboardSlotId) => void;
  onMoveCard: (sourceSlotId: EndboardSlotId, targetSlotId: EndboardSlotId) => void;
  onSetSlotCards: (slotId: EndboardSlotId, cards: string[]) => void;
}) {
  const [previewCard, setPreviewCard] = useState<{ name: string; noteId?: string } | null>(null);
  const [activeStackSlot, setActiveStackSlot] = useState<EndboardSlotId | null>(null);
  const [stackEditIndex, setStackEditIndex] = useState<number | null | 'add'>(null);
  const [stackSearchQuery, setStackSearchQuery] = useState('');
  const [stackSearchResults, setStackSearchResults] = useState<YgoSearchCard[]>([]);
  const [isStackSearching, setIsStackSearching] = useState(false);
  const [showHand, setShowHand] = useState(() => ENDBOARD_HAND_SLOTS.some((slot) => Boolean(slots[slot.id]?.length)));
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const knownMatches = knownCards
    .filter((name) => !normalizedQuery || name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
  const combinedResults = [
    ...knownMatches.map((name) => ({ name, source: 'Known card' })),
    ...searchResults
      .filter((card) => !knownMatches.some((name) => name.toLowerCase() === card.name.toLowerCase()))
      .map((card) => ({ name: card.name, source: 'YGOPRO' })),
  ];
  const displayedResults = combinedResults.length > 0
    ? combinedResults
    : searchResults.map((card) => ({ name: card.name, source: 'YGOPRO' }));

  useEffect(() => {
    if (ENDBOARD_HAND_SLOTS.some((slot) => Boolean(slots[slot.id]?.length))) {
      setShowHand(true);
    }
  }, [slots]);

  useEffect(() => {
    if (stackEditIndex === null || stackSearchQuery.trim().length < 2) {
      setStackSearchResults([]);
      setIsStackSearching(false);
      return;
    }

    let cancelled = false;
    setIsStackSearching(true);
    const timeout = window.setTimeout(async () => {
      const results = await searchYgoCards(stackSearchQuery);
      if (cancelled) return;
      setStackSearchResults(results);
      setIsStackSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [stackEditIndex, stackSearchQuery]);

  const closeStackCardPicker = () => {
    setStackEditIndex(null);
    setStackSearchQuery('');
    setStackSearchResults([]);
    setIsStackSearching(false);
  };

  const selectStackCard = (cardName: string) => {
    if (!activeStackSlot || stackEditIndex === null) return;
    const nextCards = [...(slots[activeStackSlot] || [])];

    if (stackEditIndex === 'add') {
      nextCards.push(cardName);
    } else {
      nextCards[stackEditIndex] = cardName;
    }

    onSetSlotCards(activeStackSlot, nextCards);
    closeStackCardPicker();
  };

  const moveStackCard = (index: number, direction: -1 | 1) => {
    if (!activeStackSlot) return;
    const nextCards = [...(slots[activeStackSlot] || [])];
    const targetIndex = index + direction;
    if (!nextCards[index] || targetIndex < 0 || targetIndex >= nextCards.length) return;
    [nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]];
    onSetSlotCards(activeStackSlot, nextCards);
  };

  const removeStackCard = (index: number) => {
    if (!activeStackSlot) return;
    onSetSlotCards(activeStackSlot, (slots[activeStackSlot] || []).filter((_, cardIndex) => cardIndex !== index));
  };

  const renderSlot = (slot: EndboardSlotConfig) => (
    <EndboardSlot
      key={slot.id}
      slot={slot}
      cardNames={slots[slot.id] || []}
      cardNotes={cardNotes}
      getCardNoteId={getCardNoteId}
      onPick={() => { if (!activeSlot) onOpenSearch(slot.id); }}
      onPreview={(cardName, cardIndex) => setPreviewCard({
        name: cardName,
        noteId: getCardNoteId?.(slot.id, cardIndex),
      })}
      onBrowse={() => setActiveStackSlot(slot.id)}
      onRemove={() => { if (!activeSlot) onRemoveCard(slot.id); }}
      onDragStart={(event) => {
        if (!slots[slot.id]?.length) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(ENDBOARD_DRAG_DATA_TYPE, slot.id);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(ENDBOARD_DRAG_DATA_TYPE)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const sourceSlotId = event.dataTransfer.getData(ENDBOARD_DRAG_DATA_TYPE) as EndboardSlotId;
        if (!sourceSlotId) return;

        event.preventDefault();
        if (!activeSlot) onMoveCard(sourceSlotId, slot.id);
      }}
    />
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="relative z-10 mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowHand((current) => !current)}
          aria-expanded={showHand}
          className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-display font-semibold text-amber-200 transition-colors hover:bg-amber-300/15 hover:text-amber-100"
        >
          {showHand ? 'Hide Hand' : 'Show Hand'}
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[15%] border-t border-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-[38%] border-t border-white/10" />
      <div className="pointer-events-none absolute inset-x-7 top-[37%] h-[17%] border-y border-white/10" />
      {/* Keep slot controls below the picker and inactive while a name is being edited. */}
      <div
        {...(activeSlot ? { inert: '' } : {})}
        className="relative isolate grid grid-cols-7 grid-rows-[0.58fr_1fr_1fr] gap-x-4 gap-y-6">
        {ENDBOARD_SLOTS.map(renderSlot)}
      </div>
      {showHand && (
        <div {...(activeSlot ? { inert: '' } : {})} className="relative isolate mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-amber-200">Cards in hand</h3>
            <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">
              Optional
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {ENDBOARD_HAND_SLOTS.map(renderSlot)}
          </div>
        </div>
      )}
      <EndboardCardPreview
        cardName={previewCard?.name ?? null}
        cardInfo={previewCard?.noteId ? cardNotes[previewCard.noteId] ?? '' : ''}
        onCardInfoChange={previewCard?.noteId ? (text) => onCardNoteChange?.(previewCard.noteId!, text) : undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewCard(null);
        }}
      />
      <Dialog
        open={Boolean(activeStackSlot)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setActiveStackSlot(null);
            closeStackCardPicker();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle>Cards in this slot</DialogTitle>
            <button
              type="button"
              onClick={() => {
                setStackEditIndex('add');
                setStackSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-display font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Add card
            </button>
          </div>
          <DialogDescription>
            Preview, replace, remove, or reorder cards. Cards are shown from bottom to top.
          </DialogDescription>
          {stackEditIndex !== null && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-display font-semibold text-foreground">
                  {stackEditIndex === 'add' ? 'Add card to top' : `Replace card ${stackEditIndex + 1}`}
                </p>
                <button
                  type="button"
                  onClick={closeStackCardPicker}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
                  aria-label="Close stack card picker"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={stackSearchQuery}
                  onChange={(event) => setStackSearchQuery(event.target.value)}
                  autoFocus
                  placeholder="Search card name..."
                  className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {[...knownCards
                  .filter((name) => !stackSearchQuery.trim() || name.toLowerCase().includes(stackSearchQuery.trim().toLowerCase()))
                  .map((name) => ({ name, source: 'Known card' })),
                ...stackSearchResults
                  .filter((card) => !knownCards.some((name) => name.toLowerCase() === card.name.toLowerCase()))
                  .map((card) => ({ name: card.name, source: 'YGOPRO' }))]
                  .slice(0, 12)
                  .map((card) => (
                    <button
                      type="button"
                      key={card.name}
                      onClick={() => selectStackCard(card.name)}
                      className="rounded-full border border-border/60 bg-secondary/60 px-3 py-1.5 text-xs font-display font-semibold text-foreground hover:border-primary/50 hover:bg-primary/10"
                    >
                      {card.name}
                    </button>
                  ))}
                {isStackSearching && <span className="px-2 py-1.5 text-xs text-muted-foreground">Searching...</span>}
              </div>
            </div>
          )}
          <div className="grid max-h-[70dvh] grid-cols-2 gap-3 overflow-y-auto py-2 sm:grid-cols-3 md:grid-cols-4">
            {(activeStackSlot ? slots[activeStackSlot] || [] : []).map((stackedCardName, index, stack) => (
              <div
                key={`${stackedCardName}-${index}`}
                className="group rounded-xl border border-border/60 bg-secondary/40 p-2 text-left transition-all hover:border-primary/50 hover:bg-secondary/70"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveStackSlot(null);
                    setPreviewCard({
                      name: stackedCardName,
                      noteId: activeStackSlot ? getCardNoteId?.(activeStackSlot, index) : undefined,
                    });
                  }}
                  className="block aspect-[0.686] w-full overflow-hidden rounded-lg bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`Preview ${stackedCardName} from endboard slot`}
                >
                  <EndboardSlotCard name={stackedCardName} />
                </button>
                <span className="mt-2 block line-clamp-2 text-xs font-display font-semibold text-foreground">
                  {stackedCardName}
                </span>
                <span className="mt-1 block text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">
                  {index === 0 ? 'Bottom card' : index === stack.length - 1 ? 'Top card' : `Card ${index + 1}`}
                </span>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStackCard(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Move ${stackedCardName} toward bottom`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStackCard(index, 1)}
                    disabled={index === stack.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Move ${stackedCardName} toward top`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStackEditIndex(index);
                      setStackSearchQuery('');
                    }}
                    className="ml-auto rounded-md border border-border/60 px-2 py-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground"
                    aria-label={`Replace ${stackedCardName}`}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStackCard(index)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${stackedCardName} from stack`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {activeSlot && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-background/95 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Add card</h3>
                <p className="text-xs text-muted-foreground">Search a card to add to this endboard slot.</p>
              </div>
              <button
                type="button"
                onClick={onCloseSearch}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                aria-label="Close endboard card search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                autoFocus
                placeholder="Search card name..."
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20 p-2">
              {isSearching ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : displayedResults.length > 0 ? (
                <div className="space-y-1">
                  {displayedResults.map((card) => (
                    <button
                      key={`${card.source}-${card.name}`}
                      type="button"
                      onClick={() => onSelectCard(card.name)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-primary/10"
                    >
                      <span>{card.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.source}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center text-center text-sm text-muted-foreground">
                  No cards found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
