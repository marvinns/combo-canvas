import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactElement } from 'react';
import {
  createCombinedDeckAssignmentFromTexts,
  createDeckAssignment,
  createLibraryDeck,
  getLibraryDeckNames,
  getDeckBlockingErrors,
  getComboLibraryBackup,
  getSavedCombos,
  importComboLibraryBackup,
  normalizeComboLibraryBackup,
  saveCombo,
  updateCombo,
  renameDeck,
  duplicateCombo,
  deleteCombo,
  moveComboInLibrary,
  createDeckSubsection,
  deleteDeckSubsection,
  getDeckSubsections,
  getComboDeckDraftText,
  renameDeckSubsection,
  validateDeckAssignment,
  maintainExtraDeckFilter,
  type DeckAssignment,
  type DeckCard,
  type DeckSection,
  type DeckSubsection,
  type SavedCombo,
} from '@/lib/comboLibrary';
import { useCardImage } from '@/hooks/useCardImage';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { ChevronDown, ChevronLeft, ChevronRight, Grid2X2, ImagePlus, Info, List, Maximize2, Plus, Search, X } from 'lucide-react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import seedBackup from '@/data/combo-library-seed.json';
import { getComboBranchGroups, getEndboardRoute, parseCombo } from '@/lib/comboParser';

interface ComboLibraryProps {
  currentText: string;
  currentEndboardSlots?: SavedCombo['endboardSlots'];
  currentStepComments?: SavedCombo['stepComments'];
  currentComboLinks?: SavedCombo['comboLinks'];
  currentCardNotes?: SavedCombo['cardNotes'];
  currentEndboardSlotPrefix?: string;
  activeComboId?: string | null;
  externalSavedCombo?: SavedCombo | null;
  onLoad: (combo: SavedCombo) => void;
  onSave?: (combo: SavedCombo) => void;
  onCollapse?: () => void;
}

const UNASSIGNED_DECK = '__unassigned__';
const ALL_SUBSECTIONS = 'all';
const UNCATEGORIZED_SUBSECTION = '__uncategorized__';
const COMBO_LIBRARY_VIEW_KEY = 'combo-library-view-v2';
const COMBO_LIBRARY_DECK_KEY = 'combo-library-selected-deck';
const DECK_THUMBNAILS_STORAGE_KEY = 'combo-library-deck-thumbnails';
const DECK_COLORS_STORAGE_KEY = 'combo-library-deck-colors';
const GITHUB_SEED_BACKUP = normalizeComboLibraryBackup(seedBackup);
type ComboLibraryView = 'search' | 'cards' | 'compact';
type ComboDropPlacement = 'before' | 'after';
type ComboPreviewCardField = 'playsAroundCards' | 'requiredCards';
type ComboPreviewPosition = { bottom: number; left: number; width: number; maxHeight: number };

function getInitialComboLibraryView(): ComboLibraryView {
  if (typeof window === 'undefined') return 'search';

  try {
    const saved = window.localStorage.getItem(COMBO_LIBRARY_VIEW_KEY);
    return saved === 'compact' || saved === 'cards' ? saved : 'search';
  } catch {
    return 'search';
  }
}

function getInitialSelectedDeck(): string {
  if (typeof window === 'undefined') return 'all';

  try {
    return window.localStorage.getItem(COMBO_LIBRARY_DECK_KEY) || 'all';
  } catch {
    return 'all';
  }
}

const SECTION_LIMITS: Record<DeckSection, number> = {
  main: 60,
  extra: 15,
  side: 15,
};
const SECTION_LABELS: Record<DeckSection, string> = {
  main: 'Main Deck',
  extra: 'Extra Deck',
  side: 'Side Deck',
};

const PREVIEW_ENDBOARD_SLOT_ORDER = [
  'top-left',
  'top-right',
  'extra-left',
  'monster-1',
  'monster-2',
  'monster-3',
  'monster-4',
  'monster-5',
  'extra-right',
  'spell-left',
  'spell-1',
  'spell-2',
  'spell-3',
  'spell-4',
  'spell-5',
  'spell-right',
  'hand-1',
  'hand-2',
  'hand-3',
  'hand-4',
  'hand-5',
  'hand-6',
];

const DECK_NAME_STYLES = [
  { id: 'rose', label: 'Rose', swatch: 'bg-rose-300', text: 'text-rose-300', hoverRing: 'hover:ring-rose-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(253,164,175,0.20)]' },
  { id: 'red', label: 'Red', swatch: 'bg-red-300', text: 'text-red-300', hoverRing: 'hover:ring-red-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(252,165,165,0.20)]' },
  { id: 'amber', label: 'Gold', swatch: 'bg-amber-300', text: 'text-amber-300', hoverRing: 'hover:ring-amber-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(252,211,77,0.20)]' },
  { id: 'yellow', label: 'Yellow', swatch: 'bg-yellow-300', text: 'text-yellow-300', hoverRing: 'hover:ring-yellow-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(253,224,71,0.20)]' },
  { id: 'lime', label: 'Lime', swatch: 'bg-lime-300', text: 'text-lime-300', hoverRing: 'hover:ring-lime-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(190,242,100,0.20)]' },
  { id: 'emerald', label: 'Emerald', swatch: 'bg-emerald-300', text: 'text-emerald-300', hoverRing: 'hover:ring-emerald-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(110,231,183,0.20)]' },
  { id: 'teal', label: 'Teal', swatch: 'bg-teal-300', text: 'text-teal-300', hoverRing: 'hover:ring-teal-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(94,234,212,0.20)]' },
  { id: 'sky', label: 'Sky', swatch: 'bg-sky-300', text: 'text-sky-300', hoverRing: 'hover:ring-sky-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(125,211,252,0.20)]' },
  { id: 'cyan', label: 'Cyan', swatch: 'bg-cyan-300', text: 'text-cyan-300', hoverRing: 'hover:ring-cyan-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(103,232,249,0.20)]' },
  { id: 'blue', label: 'Blue', swatch: 'bg-blue-300', text: 'text-blue-300', hoverRing: 'hover:ring-blue-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(147,197,253,0.20)]' },
  { id: 'indigo', label: 'Indigo', swatch: 'bg-indigo-300', text: 'text-indigo-300', hoverRing: 'hover:ring-indigo-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(165,180,252,0.20)]' },
  { id: 'violet', label: 'Violet', swatch: 'bg-violet-300', text: 'text-violet-300', hoverRing: 'hover:ring-violet-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(196,181,253,0.20)]' },
  { id: 'fuchsia', label: 'Fuchsia', swatch: 'bg-fuchsia-300', text: 'text-fuchsia-300', hoverRing: 'hover:ring-fuchsia-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(240,171,252,0.20)]' },
  { id: 'orange', label: 'Orange', swatch: 'bg-orange-300', text: 'text-orange-300', hoverRing: 'hover:ring-orange-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(253,186,116,0.20)]' },
  { id: 'slate', label: 'Silver', swatch: 'bg-slate-300', text: 'text-slate-300', hoverRing: 'hover:ring-slate-300/55', hoverShadow: 'hover:shadow-[0_0_28px_rgba(203,213,225,0.20)]' },
] as const;

const DECK_NAME_STYLE_OVERRIDES = [
  { pattern: /\bbranded\b/i, style: { text: 'text-red-300', hoverRing: 'hover:ring-red-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(252,165,165,0.24)]' } },
  { pattern: /\bd\/d\/d\b/i, style: { text: 'text-rose-300', hoverRing: 'hover:ring-rose-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(253,164,175,0.24)]' } },
  { pattern: /\belfnotes?\b/i, style: { text: 'text-indigo-300', hoverRing: 'hover:ring-indigo-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(165,180,252,0.24)]' } },
  { pattern: /\b(?:elemental\s+)?hero(?:es)?\b/i, style: { text: 'text-amber-300', hoverRing: 'hover:ring-amber-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(252,211,77,0.24)]' } },
  { pattern: /\blunalight\b/i, style: { text: 'text-slate-300', hoverRing: 'hover:ring-slate-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(203,213,225,0.24)]' } },
  { pattern: /\bmagnet\s+warrior\b/i, style: { text: 'text-orange-300', hoverRing: 'hover:ring-orange-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(253,186,116,0.24)]' } },
  { pattern: /\b(?:white\s+forest|wf)\b.*\bazamina\b|\bazamina\b.*\b(?:white\s+forest|wf)\b/i, style: { text: 'text-sky-300', hoverRing: 'hover:ring-sky-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(125,211,252,0.24)]' } },
  { pattern: /\byummy\s+snake-eyes\s+dragoon\b/i, style: { text: 'text-violet-300', hoverRing: 'hover:ring-violet-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(196,181,253,0.24)]' } },
  { pattern: /\byummy\s+snake-eyes\b/i, style: { text: 'text-lime-300', hoverRing: 'hover:ring-lime-300/60', hoverShadow: 'hover:shadow-[0_0_28px_rgba(190,242,100,0.24)]' } },
] as const;

function getDeckNameStyle(deck: string) {
  const customColorId = getCustomDeckColors()[deck];
  const customStyle = DECK_NAME_STYLES.find(({ id }) => id === customColorId);
  if (customStyle) return customStyle;

  const override = DECK_NAME_STYLE_OVERRIDES.find(({ pattern }) => pattern.test(deck));
  if (override) return override.style;

  let hash = 0;

  for (let index = 0; index < deck.length; index += 1) {
    hash = (hash * 31 + deck.charCodeAt(index)) >>> 0;
  }

  return DECK_NAME_STYLES[hash % DECK_NAME_STYLES.length];
}

function getDeckThumbnails(): Record<string, string> {
  try {
    const value = JSON.parse(window.localStorage.getItem(DECK_THUMBNAILS_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {};
  } catch {
    return {};
  }
}

function getCustomDeckColors(): Record<string, string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DECK_COLORS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function setCustomDeckColor(deckName: string, colorId?: string): void {
  const colors = getCustomDeckColors();
  if (colorId && DECK_NAME_STYLES.some(({ id }) => id === colorId)) {
    colors[deckName] = colorId;
  } else {
    delete colors[deckName];
  }
  window.localStorage.setItem(DECK_COLORS_STORAGE_KEY, JSON.stringify(colors));
}

function migrateCustomDeckColor(oldDeckName: string, newDeckName: string): void {
  const colors = getCustomDeckColors();
  if (!colors[oldDeckName]) return;
  colors[newDeckName] = colors[oldDeckName];
  delete colors[oldDeckName];
  window.localStorage.setItem(DECK_COLORS_STORAGE_KEY, JSON.stringify(colors));
}

function getComboDeckName(combo: SavedCombo): string {
  return combo.assignedDeck?.name || combo.deck || 'Unassigned';
}

function getSubsectionDepth(subsection: DeckSubsection, subsections: DeckSubsection[]): number {
  let depth = 0;
  let parentId = subsection.parentId;
  const seen = new Set<string>([subsection.id]);

  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = subsections.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }

  return depth;
}

function getSubsectionOptionLabel(subsection: DeckSubsection, subsections: DeckSubsection[]): string {
  const depth = getSubsectionDepth(subsection, subsections);
  return `${'\u00a0\u00a0'.repeat(depth)}${subsection.parentId ? '↳ ' : ''}${subsection.name}`;
}

function extractComboCardNames(text: string): string[] {
  return [...text.matchAll(/\[(.+?)\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function getComboPreviewCardName(combo: SavedCombo): string {
  if (combo.thumbnailCardName?.trim()) return combo.thumbnailCardName.trim();

  const textCard = extractComboCardNames(combo.text)[0];
  if (textCard) return textCard;

  return combo.assignedDeck?.extra[0]?.name ||
    combo.assignedDeck?.main[0]?.name ||
    combo.assignedDeck?.side[0]?.name ||
    combo.name;
}

function doesComboMatchSearch(combo: SavedCombo, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return `${combo.name} ${getComboDeckName(combo)}`.toLowerCase().includes(normalizedQuery);
}

function normalizePreviewSlotCards(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName.trim()] : []);
}

function getComboEndboardPreviewCards(
  combo: SavedCombo,
  preferredSlotPrefix?: string,
): Array<{ name: string; slotId: string; isHand: boolean; stackCount: number }> {
  const slots = combo.endboardSlots || {};
  const route = getEndboardRoute(getComboBranchGroups(parseCombo(combo.text)));
  const slotPrefix = preferredSlotPrefix ?? (route ? `route:${route.baseStep}:${route.route}:` : undefined);

  return PREVIEW_ENDBOARD_SLOT_ORDER.flatMap((slotId) => {
    const cards = normalizePreviewSlotCards(slots[slotPrefix ? `${slotPrefix}${slotId}` : slotId]);
    if (cards.length === 0) return [];

    return [{
      name: cards[cards.length - 1],
      slotId,
      isHand: slotId.startsWith('hand-'),
      stackCount: cards.length,
    }];
  });
}

function getDeckTotal(cards: DeckCard[]): number {
  return cards.reduce((total, card) => total + card.count, 0);
}

function getCardTotalAcrossDeck(deck: DeckAssignment, cardName: string): number {
  const normalizedName = cardName.toLowerCase();
  return [...deck.main, ...deck.extra, ...deck.side]
    .filter((card) => card.name.toLowerCase() === normalizedName)
    .reduce((total, card) => total + card.count, 0);
}

function sortDeckCards(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((a, b) => a.name.localeCompare(b.name));
}

function isMainExtraConflict(section: DeckSection, otherSection: DeckSection): boolean {
  return (section === 'main' && otherSection === 'extra') || (section === 'extra' && otherSection === 'main');
}

function cloneDeck(deck: DeckAssignment): DeckAssignment {
  return {
    ...deck,
    main: deck.main.map((card) => ({ ...card })),
    extra: deck.extra.map((card) => ({ ...card })),
    side: deck.side.map((card) => ({ ...card })),
  };
}

function areDeckAssignmentsEqual(first?: DeckAssignment, second?: DeckAssignment): boolean {
  return JSON.stringify(first || null) === JSON.stringify(second || null);
}

function isManualDeck(deck?: DeckAssignment): boolean {
  return deck?.source === 'manual';
}

function DeckCardTile({
  card,
  section,
  isSelected,
  onSelect,
  onCountChange,
  onRemove,
}: {
  card: DeckCard;
  section: DeckSection;
  isSelected: boolean;
  onSelect: () => void;
  onCountChange?: (count: number) => void;
  onRemove?: () => void;
}) {
  const { data, isLoading } = useCardImage(card.name);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const cardLabel = data?.name || card.name;

  return (
    <div className="space-y-1">
      <div className="group/card relative aspect-[0.686] w-full">
        <button
          type="button"
          draggable
          onClick={onSelect}
          onDoubleClick={() => setIsPreviewOpen(true)}
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-combo-card', JSON.stringify({ section, name: card.name }));
            event.dataTransfer.effectAllowed = 'move';
          }}
          className={`relative block h-full w-full overflow-hidden rounded-md border bg-secondary text-left transition-all duration-200 ${
            isSelected ? 'border-accent shadow-[0_0_18px_hsl(var(--accent)/0.22)]' : 'border-border/60 hover:border-accent/40'
          }`}
          aria-label={`Select ${card.name}`}
        >
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : data ? (
            <img src={data.imageUrl} alt={data.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
              {card.name}
            </div>
          )}
        </button>
        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full border border-white/20 bg-black/55 px-1.5 py-0.5 text-[10px] font-display font-semibold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 group-hover/card:bg-black/70">
          x{card.count}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/85 shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-destructive/50 hover:bg-destructive/85 hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 sm:opacity-0 sm:group-hover/card:opacity-100 sm:group-focus-within/card:opacity-100"
            aria-label={`Remove ${card.name}`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        )}
      </div>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black/95 p-3 sm:rounded-none sm:p-6">
          <DialogTitle className="sr-only">{cardLabel}</DialogTitle>
          <DialogDescription className="sr-only">Full screen card preview for {cardLabel}</DialogDescription>
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
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
              <div className="flex h-[min(calc(100dvh-2rem),720px)] w-[min(86vw,520px)] items-center justify-center rounded-[28px] border border-white/15 bg-white/5 p-8 text-center text-xl text-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                {cardLabel}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {isSelected && onCountChange && (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onCountChange(Math.max(1, card.count - 1))}
            disabled={card.count <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-secondary/70 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-35"
            aria-label={`Decrease ${card.name} copies`}
          >
            -
          </button>
          <span className="min-w-6 text-center text-xs font-display font-semibold text-foreground">{card.count}</span>
          <button
            type="button"
            onClick={() => onCountChange(Math.min(3, card.count + 1))}
            disabled={card.count >= 3}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-secondary/70 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-35"
            aria-label={`Increase ${card.name} copies`}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function DeckSectionView({
  section,
  title,
  cards,
  range,
  selectedCardKey,
  onSelectCard,
  onCardCountChange,
  onCardMove,
  onCardRemove,
}: {
  section: DeckSection;
  title: string;
  cards: DeckCard[];
  range: string;
  selectedCardKey?: string | null;
  onSelectCard?: (cardName: string) => void;
  onCardCountChange?: (cardName: string, count: number) => void;
  onCardMove?: (sourceSection: DeckSection, cardName: string, targetSection: DeckSection) => void;
  onCardRemove?: (cardName: string) => void;
}) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const rawPayload = event.dataTransfer.getData('application/x-combo-card');
    if (!rawPayload) return;

    event.preventDefault();
    try {
      const payload = JSON.parse(rawPayload) as { section?: DeckSection; name?: string };
      if (!payload.section || !payload.name || payload.section === section) return;
      onCardMove?.(payload.section, payload.name, section);
    } catch {
      return;
    }
  };

  return (
    <div
      className="rounded-lg border border-border/60 bg-secondary/30 p-3"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-combo-card')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">
          {getDeckTotal(cards)} / {range}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No cards listed.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {cards.map((card) => (
            <DeckCardTile
              key={card.name}
              card={card}
              section={section}
              isSelected={selectedCardKey === card.name}
              onSelect={() => onSelectCard?.(card.name)}
              onCountChange={onCardCountChange ? (count) => onCardCountChange(card.name, count) : undefined}
              onRemove={onCardRemove ? () => onCardRemove(card.name) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ComboPreviewCardThumb({ name, compact = false }: { name: string; compact?: boolean }) {
  const { data, isLoading } = useCardImage(name);
  const imageUrl = data?.imageUrl || data?.croppedImageUrl;
  const label = data?.name || name;

  return (
    <div className={`min-w-0 overflow-hidden rounded-md border border-border/60 bg-secondary/45 ${compact ? 'p-1' : 'p-1.5'}`}>
      <div className={`relative mx-auto aspect-[0.686] w-full overflow-hidden rounded border border-white/10 bg-background/60 ${compact ? 'max-w-[2.8rem]' : 'max-w-[3.6rem]'}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[0.5rem] font-display font-semibold leading-tight text-muted-foreground">
            {isLoading ? '...' : label}
          </div>
        )}
      </div>
      <p className="mt-1 truncate text-[0.58rem] font-display font-semibold leading-tight text-foreground/85" title={label}>
        {label}
      </p>
    </div>
  );
}

function ComboPreviewEditableCardList({
  combo,
  title,
  field,
  cards,
  accentClass,
  onUpdate,
}: {
  combo: SavedCombo;
  title: string;
  field: ComboPreviewCardField;
  cards?: string[];
  accentClass: string;
  onUpdate: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
}) {
  const [draftCard, setDraftCard] = useState('');
  const normalizedCards = cards || [];

  const addCard = () => {
    const trimmedCard = draftCard.trim();
    if (!trimmedCard) return;
    onUpdate(combo, field, [...normalizedCards, trimmedCard]);
    setDraftCard('');
  };

  const removeCard = (cardIndex: number) => {
    onUpdate(combo, field, normalizedCards.filter((_, index) => index !== cardIndex));
  };

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-background/35 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className={`font-display text-[0.68rem] font-bold uppercase tracking-wide ${accentClass}`}>
          {title}
        </h4>
        <span className="text-[0.58rem] font-display font-semibold text-muted-foreground">{normalizedCards.length}</span>
      </div>
      <div className="mb-2 flex gap-1">
        <input
          value={draftCard}
          onChange={(event) => setDraftCard(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCard();
            }
          }}
          onClick={(event) => event.stopPropagation()}
          aria-label={`${title} card for ${combo.name}`}
          placeholder="Card name..."
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-secondary/60 px-2 py-1 text-[0.65rem] text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            addCard();
          }}
          aria-label={`Add ${title.toLowerCase()} card for ${combo.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {normalizedCards.length > 0 ? normalizedCards.map((cardName, index) => (
          <div key={`${cardName}-${index}`} className="group/card relative">
            <ComboPreviewCardThumb name={cardName} compact />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeCard(index);
              }}
              aria-label={`Remove ${cardName} from ${title.toLowerCase()}`}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-background/70 bg-background/80 text-muted-foreground opacity-100 shadow-lg transition-colors hover:text-foreground sm:opacity-0 sm:group-hover/card:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )) : (
          <p className="rounded-md border border-dashed border-border/50 px-2 py-3 text-center text-[0.65rem] leading-4 text-muted-foreground">
            Add cards here.
          </p>
        )}
      </div>
    </div>
  );
}

function ComboPreviewHoverWindow({
  combo,
  onUpdatePreviewCards,
  onOpenPreview,
  previewPosition,
  previewSlotPrefix,
  onPointerEnter,
  onPointerLeave,
}: {
  combo: SavedCombo;
  onUpdatePreviewCards: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
  onOpenPreview: (combo: SavedCombo) => void;
  previewPosition: ComboPreviewPosition | null;
  previewSlotPrefix?: string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  if (!previewPosition) return null;

  return (
    <div
      className="fixed z-50 overflow-y-auto rounded-2xl border border-border/60 bg-background/90 p-3 text-left shadow-2xl backdrop-blur-xl"
      style={previewPosition}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenPreview(combo);
        }}
        aria-label={`Expand preview for ${combo.name}`}
        title="Expand preview"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/75 text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <ComboPreviewContent combo={combo} onUpdatePreviewCards={onUpdatePreviewCards} previewSlotPrefix={previewSlotPrefix} />
    </div>
  );
}

function ComboPreviewContent({
  combo,
  onUpdatePreviewCards,
  previewSlotPrefix,
  isFullscreen = false,
}: {
  combo: SavedCombo;
  onUpdatePreviewCards: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
  previewSlotPrefix?: string;
  isFullscreen?: boolean;
}) {
  const endboardCards = getComboEndboardPreviewCards(combo, previewSlotPrefix);

  return (
      <div className={`grid gap-3 md:grid-cols-[3fr_1fr_1fr] ${isFullscreen ? 'h-full min-h-0' : 'max-h-[22rem]'}`}>
        <section className={`rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 ${isFullscreen ? 'min-h-0 overflow-y-auto' : 'min-h-[12rem]'}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wide text-emerald-300">Endboard Preview</h3>
            <span className="text-[0.65rem] font-display font-semibold text-muted-foreground">{endboardCards.length} cards</span>
          </div>
          {endboardCards.length > 0 ? (
            <div className={`grid gap-2 ${isFullscreen ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' : 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6'}`}>
              {endboardCards.map((card) => (
                <div key={`${card.slotId}-${card.name}`} className="relative">
                  <ComboPreviewCardThumb name={card.name} />
                  {card.stackCount > 1 && (
                    <span className="absolute -right-1 -top-1 rounded-full border border-background bg-primary px-1.5 py-0.5 text-[0.55rem] font-display font-bold text-primary-foreground">
                      x{card.stackCount}
                    </span>
                  )}
                  {card.isHand && (
                    <span className="mt-1 block truncate text-center text-[0.55rem] font-display font-bold uppercase text-amber-300">
                      Hand
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[9rem] items-center justify-center rounded-xl border border-dashed border-emerald-300/25 text-center text-xs leading-5 text-muted-foreground">
              No saved endboard yet.
            </div>
          )}
        </section>
        <ComboPreviewEditableCardList
          combo={combo}
          title="Plays Around"
          field="playsAroundCards"
          cards={combo.playsAroundCards}
          accentClass="text-amber-300"
          onUpdate={onUpdatePreviewCards}
        />
        <ComboPreviewEditableCardList
          combo={combo}
          title="Required Cards"
          field="requiredCards"
          cards={combo.requiredCards}
          accentClass="text-primary"
          onUpdate={onUpdatePreviewCards}
        />
      </div>
  );
}

function ComboPreviewButton({
  combo,
  onUpdatePreviewCards,
  onOpenPreview,
  previewSlotPrefix,
}: {
  combo: SavedCombo;
  onUpdatePreviewCards: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
  onOpenPreview: (combo: SavedCombo) => void;
  previewSlotPrefix?: string;
}) {
  const [previewPosition, setPreviewPosition] = useState<ComboPreviewPosition | null>(null);
  const closePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClosePreviewTimeout = () => {
    if (!closePreviewTimeoutRef.current) return;
    clearTimeout(closePreviewTimeoutRef.current);
    closePreviewTimeoutRef.current = null;
  };

  const updatePreviewPosition = (previewTrigger: HTMLElement) => {
    clearClosePreviewTimeout();

    const rowElement = previewTrigger.closest('[data-combo-preview-row]') as HTMLElement | null;
    let rowRect = (rowElement || previewTrigger).getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const viewportMargin = 12;
    const panelGap = 18;
    const panelMaxHeight = 360;
    const preferredMinHeight = 140;

    if (
      rowElement &&
      typeof rowElement.scrollIntoView === 'function' &&
      rowRect.top - panelGap - viewportMargin < preferredMinHeight
    ) {
      rowElement.scrollIntoView({ block: 'center', inline: 'nearest' });
      rowRect = rowElement.getBoundingClientRect();
    }

    const availableAboveRow = Math.max(0, rowRect.top - panelGap - viewportMargin);
    const maxHeight = Math.min(panelMaxHeight, availableAboveRow);
    const bottom = Math.max(viewportMargin, viewportHeight - rowRect.top + panelGap);
    const availableViewportWidth = viewportWidth - (viewportMargin * 2);
    const width = Math.min(Math.max(320, rowRect.width), availableViewportWidth);
    const left = Math.min(
      Math.max(viewportMargin, rowRect.left),
      Math.max(viewportMargin, viewportWidth - width - viewportMargin),
    );

    setPreviewPosition({
      left,
      width,
      bottom,
      maxHeight,
    });
  };

  const scheduleClosePreview = () => {
    clearClosePreviewTimeout();
    closePreviewTimeoutRef.current = setTimeout(() => {
      setPreviewPosition(null);
      closePreviewTimeoutRef.current = null;
    }, 180);
  };

  useEffect(() => clearClosePreviewTimeout, []);

  return (
    <span
      className="group/preview relative inline-flex"
      onMouseEnter={(event) => updatePreviewPosition(event.currentTarget)}
      onMouseLeave={scheduleClosePreview}
      onFocus={(event) => updatePreviewPosition(event.currentTarget)}
      onBlur={scheduleClosePreview}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenPreview(combo);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 text-xs font-display font-bold text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        aria-label={`Preview ${combo.name}`}
        title="Preview"
      >
        P
      </button>
      <ComboPreviewHoverWindow
        combo={combo}
        onUpdatePreviewCards={onUpdatePreviewCards}
        onOpenPreview={onOpenPreview}
        previewPosition={previewPosition}
        previewSlotPrefix={previewSlotPrefix}
        onPointerEnter={clearClosePreviewTimeout}
        onPointerLeave={scheduleClosePreview}
      />
    </span>
  );
}

function ComboLibraryCard({
  combo,
  isEditing,
  editDeck,
  editName,
  editThumbnailCard,
  editSubsectionId,
  subsectionOptions,
  onEditDeckChange,
  onEditNameChange,
  onEditThumbnailCardChange,
  onEditSubsectionChange,
  onRename,
  onLoad,
  onViewDeck,
  onOpenNotes,
  onUpdatePreviewCards,
  onOpenPreview,
  previewSlotPrefix,
  onDuplicate,
  onStartRename,
  onDelete,
  isDeckOpen,
}: {
  combo: SavedCombo;
  isEditing: boolean;
  editDeck: string;
  editName: string;
  editThumbnailCard: string;
  editSubsectionId: string;
  subsectionOptions: DeckSubsection[];
  onEditDeckChange: (value: string) => void;
  onEditNameChange: (value: string) => void;
  onEditThumbnailCardChange: (value: string) => void;
  onEditSubsectionChange: (value: string) => void;
  onRename: () => void;
  onLoad: () => void;
  onViewDeck: () => void;
  onOpenNotes: () => void;
  onUpdatePreviewCards: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
  onOpenPreview: (combo: SavedCombo) => void;
  previewSlotPrefix?: string;
  onDuplicate: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  isDeckOpen: boolean;
}) {
  const previewCardName = getComboPreviewCardName(combo);
  const { data } = useCardImage(previewCardName);
  const deckName = getComboDeckName(combo);
  const deckStyle = getDeckNameStyle(deckName);
  const previewImageUrl = data?.croppedImageUrl || data?.imageUrl;

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
        <div className="space-y-3">
          <input
            value={editDeck}
            onChange={(event) => onEditDeckChange(event.target.value)}
            placeholder="Deck name..."
            className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
          />
          <input
            value={editName}
            onChange={(event) => onEditNameChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onRename()}
            placeholder="Combo name..."
            className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
          />
          <input
            value={editThumbnailCard}
            onChange={(event) => onEditThumbnailCardChange(event.target.value)}
            placeholder="Thumbnail card name..."
            className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
          />
          {subsectionOptions.length > 0 && (
            <select
              aria-label="Combo subsection"
              value={editSubsectionId}
              onChange={(event) => onEditSubsectionChange(event.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Uncategorized</option>
              {subsectionOptions.map((subsection) => (
                <option key={subsection.id} value={subsection.id}>{getSubsectionOptionLabel(subsection, subsectionOptions)}</option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-xl border border-border/60 bg-background/50 px-5 py-2.5 text-sm font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={onRename}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group min-w-0 p-1">
      <div
        data-combo-preview-row
        role="button"
        tabIndex={0}
        onClick={onLoad}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onLoad();
          }
        }}
        className={`relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 shadow-[0_14px_42px_rgba(0,0,0,0.22)] ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:ring-2 focus-visible:outline-none focus-visible:ring-2 ${deckStyle.hoverRing} ${deckStyle.hoverShadow}`}
      >
        {previewImageUrl && (
          <img
            src={previewImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain opacity-90 saturate-125 contrast-105 transition-all duration-300 group-hover:opacity-100"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(230_35%_7%/0.2)_0%,hsl(230_35%_7%/0.32)_42%,hsl(230_35%_7%/0.9)_100%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex justify-end">
            <span className={`max-w-[72%] truncate rounded-full border border-white/20 bg-background/65 px-3 py-1 text-[11px] font-display font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-md ${deckStyle.text}`}>
              {deckName}
            </span>
          </div>
          <div className="min-w-0 text-center">
            <span className="line-clamp-3 font-display text-lg font-bold leading-tight text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {combo.name}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 z-20 flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {combo.assignedDeck && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewDeck();
                }}
                className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-display font-semibold text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              >
                {isDeckOpen ? 'Hide Deck' : 'Deck'}
              </button>
            )}
            <ComboNotesHoverPreview notes={combo.notes}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenNotes();
                }}
                className={`group/notes relative flex h-8 w-8 items-center justify-center rounded-full border bg-background/50 text-sm backdrop-blur transition-colors hover:text-foreground ${
                  combo.notes?.trim()
                    ? 'border-primary/45 text-primary'
                    : 'border-border/60 text-muted-foreground'
                }`}
                aria-label={`Open notes for ${combo.name}`}
                title="Notes"
              >
                <Info className="h-4 w-4" />
              </button>
            </ComboNotesHoverPreview>
            <ComboPreviewButton
              combo={combo}
              onUpdatePreviewCards={onUpdatePreviewCards}
              onOpenPreview={onOpenPreview}
              previewSlotPrefix={previewSlotPrefix}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartRename();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              title="Rename"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 text-sm text-muted-foreground backdrop-blur transition-colors hover:border-destructive/40 hover:text-destructive"
              title="Delete"
            >
              ✕
            </button>
          </div>
      </div>
      </div>
    </div>
  );
}

function ComboNotesHoverPreview({ notes, children }: { notes?: string; children: ReactElement }) {
  const trimmedNotes = notes?.trim();
  if (!trimmedNotes) return children;

  return (
    <HoverCardPrimitive.Root openDelay={150} closeDelay={150}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onClick={(event) => event.stopPropagation()}
          className="z-50 w-[22rem] max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-background/95 px-3 py-2 text-left text-xs leading-5 text-foreground/90 shadow-2xl backdrop-blur-md"
          style={{ maxHeight: 'min(24rem, var(--radix-hover-card-content-available-height))' }}
        >
          {trimmedNotes}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}

function DeckView({
  deck,
  linkedCombos = [],
  onDeckSave,
}: {
  deck: DeckAssignment;
  linkedCombos?: SavedCombo[];
  onDeckSave?: (deck: DeckAssignment) => void;
}) {
  const [draftDeck, setDraftDeck] = useState(() => cloneDeck(deck));
  const validation = validateDeckAssignment(draftDeck);
  const [selectedCard, setSelectedCard] = useState<{ section: DeckSection; name: string } | null>(null);
  const [newCardName, setNewCardName] = useState('');
  const [newCardSection, setNewCardSection] = useState<DeckSection>('main');
  const canEditDeck = Boolean(onDeckSave);
  const hasDeckChanges = JSON.stringify(draftDeck) !== JSON.stringify(deck);

  useEffect(() => {
    setDraftDeck(cloneDeck(deck));
    setSelectedCard(null);
  }, [deck]);

  const updateDraftDeck = (createNextDeck: (deck: DeckAssignment) => DeckAssignment | null) => {
    setDraftDeck((currentDeck) => {
      const nextDeck = createNextDeck(currentDeck);
      return nextDeck || currentDeck;
    });
  };

  const handleAddCard = () => {
    const trimmedName = newCardName.trim();
    if (!trimmedName || !canEditDeck) return;

    updateDraftDeck((currentDeck) => {
      if (getDeckTotal(currentDeck[newCardSection]) >= SECTION_LIMITS[newCardSection]) return null;
      if (getCardTotalAcrossDeck(currentDeck, trimmedName) >= 3) return null;
      if (isMainExtraConflict(newCardSection, 'main') && currentDeck.main.some((card) => card.name.toLowerCase() === trimmedName.toLowerCase())) {
        return null;
      }
      if (isMainExtraConflict(newCardSection, 'extra') && currentDeck.extra.some((card) => card.name.toLowerCase() === trimmedName.toLowerCase())) {
        return null;
      }

      const existingCard = currentDeck[newCardSection].find((card) => card.name.toLowerCase() === trimmedName.toLowerCase());
      const nextCards = existingCard
        ? currentDeck[newCardSection].map((card) =>
            card.name.toLowerCase() === trimmedName.toLowerCase()
              ? { ...card, count: Math.min(3, card.count + 1) }
              : card,
          )
        : [...currentDeck[newCardSection], { name: trimmedName, count: 1 }];

      return {
        ...currentDeck,
        [newCardSection]: sortDeckCards(nextCards),
      };
    });
    setNewCardName('');
  };

  const handleCardCountChange = (section: DeckSection, cardName: string, count: number) => {
    if (!canEditDeck) return;

    updateDraftDeck((currentDeck) => {
      const currentCard = currentDeck[section].find((card) => card.name === cardName);
      if (!currentCard) return null;

      const totalOutsideCard = getCardTotalAcrossDeck(currentDeck, cardName) - currentCard.count;
      const nextCount = Math.min(3 - totalOutsideCard, Math.max(1, count));
      if (nextCount < 1) return null;

      return {
        ...currentDeck,
        [section]: currentDeck[section].map((card) =>
          card.name === cardName
            ? { ...card, count: nextCount }
            : card,
        ),
      };
    });
  };

  const handleCardMove = (sourceSection: DeckSection, cardName: string, targetSection: DeckSection) => {
    if (!canEditDeck) return;

    updateDraftDeck((currentDeck) => {
      const sourceCard = currentDeck[sourceSection].find((card) => card.name === cardName);
      if (!sourceCard || sourceSection === targetSection) return null;
      if (getDeckTotal(currentDeck[targetSection]) + sourceCard.count > SECTION_LIMITS[targetSection]) return null;
      if (
        isMainExtraConflict(targetSection, 'main') &&
        sourceSection !== 'main' &&
        currentDeck.main.some((card) => card.name.toLowerCase() === cardName.toLowerCase())
      ) {
        return null;
      }
      if (
        isMainExtraConflict(targetSection, 'extra') &&
        sourceSection !== 'extra' &&
        currentDeck.extra.some((card) => card.name.toLowerCase() === cardName.toLowerCase())
      ) {
        return null;
      }

      const targetCard = currentDeck[targetSection].find((card) => card.name === cardName);
      const nextSourceCards = currentDeck[sourceSection].filter((card) => card.name !== cardName);
      const nextTargetCards = targetCard
        ? currentDeck[targetSection].map((card) =>
            card.name === cardName
              ? { ...card, count: Math.min(3, card.count + sourceCard.count) }
              : card,
          )
        : [...currentDeck[targetSection], sourceCard];

      return {
        ...currentDeck,
        [sourceSection]: sortDeckCards(nextSourceCards),
        [targetSection]: sortDeckCards(nextTargetCards),
      };
    });
  };

  const handleCardRemove = (section: DeckSection, cardName: string) => {
    if (!canEditDeck) return;

    updateDraftDeck((currentDeck) => ({
      ...currentDeck,
      [section]: currentDeck[section].filter((card) => card.name !== cardName),
    }));

    setSelectedCard((currentCard) =>
      currentCard?.section === section && currentCard.name === cardName ? null : currentCard,
    );
  };

  const handleSaveDeck = () => {
    if (!canEditDeck || !hasDeckChanges || getDeckBlockingErrors(draftDeck).length > 0) return;
    onDeckSave?.(draftDeck);
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold text-foreground">{draftDeck.name}</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-display font-semibold ${validation.isValid ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-300' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}>
            {validation.isValid ? 'Legal deck' : 'Illegal deck'}
          </span>
          {canEditDeck && (
            <button
              type="button"
              onClick={handleSaveDeck}
              disabled={!hasDeckChanges || getDeckBlockingErrors(draftDeck).length > 0}
              className="rounded-lg bg-accent px-3 py-1.5 text-[10px] font-display font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Deck
            </button>
          )}
        </div>
      </div>
      {!validation.isValid && (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-2">
          {validation.errors.map((error) => (
            <p key={error} className="text-xs text-destructive">{error}</p>
          ))}
        </div>
      )}
      {linkedCombos.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
          <h4 className="mb-2 font-display text-sm font-semibold text-foreground">Linked combos</h4>
          <div className="flex flex-wrap gap-2">
            {linkedCombos.map((combo) => (
              <span
                key={combo.id}
                className="rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[11px] font-display font-semibold text-muted-foreground"
              >
                {combo.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {canEditDeck && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-secondary/20 p-3">
          <label className="min-w-[180px] flex-1 space-y-1">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Add card</span>
            <input
              value={newCardName}
              onChange={(event) => setNewCardName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAddCard()}
              placeholder="Card name..."
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Section</span>
            <select
              value={newCardSection}
              onChange={(event) => setNewCardSection(event.target.value as DeckSection)}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="main">Main Deck</option>
              <option value="extra">Extra Deck</option>
              <option value="side">Side Deck</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleAddCard}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
          >
            Add
          </button>
        </div>
      )}
      <DeckSectionView
        section="main"
        title="Main Deck"
        cards={draftDeck.main}
        range="40-60"
        selectedCardKey={selectedCard?.section === 'main' ? selectedCard.name : null}
        onSelectCard={(name) => setSelectedCard({ section: 'main', name })}
        onCardCountChange={canEditDeck ? (name, count) => handleCardCountChange('main', name, count) : undefined}
        onCardMove={canEditDeck ? handleCardMove : undefined}
        onCardRemove={canEditDeck ? (name) => handleCardRemove('main', name) : undefined}
      />
      <DeckSectionView
        section="extra"
        title="Extra Deck"
        cards={draftDeck.extra}
        range="1-15"
        selectedCardKey={selectedCard?.section === 'extra' ? selectedCard.name : null}
        onSelectCard={(name) => setSelectedCard({ section: 'extra', name })}
        onCardCountChange={canEditDeck ? (name, count) => handleCardCountChange('extra', name, count) : undefined}
        onCardMove={canEditDeck ? handleCardMove : undefined}
        onCardRemove={canEditDeck ? (name) => handleCardRemove('extra', name) : undefined}
      />
      <DeckSectionView
        section="side"
        title="Side Deck"
        cards={draftDeck.side}
        range="0-15"
        selectedCardKey={selectedCard?.section === 'side' ? selectedCard.name : null}
        onSelectCard={(name) => setSelectedCard({ section: 'side', name })}
        onCardCountChange={canEditDeck ? (name, count) => handleCardCountChange('side', name, count) : undefined}
        onCardMove={canEditDeck ? handleCardMove : undefined}
        onCardRemove={canEditDeck ? (name) => handleCardRemove('side', name) : undefined}
      />
    </div>
  );
}

function LibraryThumbnail({ combo }: { combo: SavedCombo }) {
  const { data } = useCardImage(getComboPreviewCardName(combo));
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-secondary/60">
      {data ? <img src={data.croppedImageUrl || data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <List className="h-4 w-4 text-muted-foreground" />}
    </span>
  );
}

function ComboLibraryCompactRow({
  combo,
  isActive,
  isEditing,
  editDeck,
  editName,
  editSubsectionId,
  subsectionOptions,
  onEditDeckChange,
  onEditNameChange,
  onEditSubsectionChange,
  onRename,
  onLoad,
  onViewDeck,
  onOpenNotes,
  onUpdatePreviewCards,
  onOpenPreview,
  previewSlotPrefix,
  onDuplicate,
  onStartRename,
  onDelete,
  onDragStart,
  onDragEnd,
  onDropCombo,
  isDeckOpen,
}: {
  combo: SavedCombo;
  isActive?: boolean;
  isEditing: boolean;
  editDeck: string;
  editName: string;
  editSubsectionId: string;
  subsectionOptions: DeckSubsection[];
  onEditDeckChange: (value: string) => void;
  onEditNameChange: (value: string) => void;
  onEditSubsectionChange: (value: string) => void;
  onRename: () => void;
  onLoad: () => void;
  onViewDeck: () => void;
  onOpenNotes: () => void;
  onUpdatePreviewCards: (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => void;
  onOpenPreview: (combo: SavedCombo) => void;
  previewSlotPrefix?: string;
  onDuplicate: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropCombo: (placement: ComboDropPlacement) => void;
  isDeckOpen: boolean;
}) {
  const deckName = getComboDeckName(combo);
  const deckStyle = getDeckNameStyle(deckName);

  if (isEditing) {
    return (
      <div className="space-y-2 rounded-lg border border-primary/35 bg-secondary/35 p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={editDeck}
            onChange={(event) => onEditDeckChange(event.target.value)}
            placeholder="Deck name..."
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
          />
          <input
            value={editName}
            onChange={(event) => onEditNameChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onRename()}
            placeholder="Combo name..."
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {subsectionOptions.length > 0 && (
            <select
              aria-label="Combo subsection"
              value={editSubsectionId}
              onChange={(event) => onEditSubsectionChange(event.target.value)}
              className="mr-auto min-w-[180px] rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Uncategorized</option>
              {subsectionOptions.map((subsection) => (
                <option key={subsection.id} value={subsection.id}>{getSubsectionOptionLabel(subsection, subsectionOptions)}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onRename}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-combo-preview-row
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-combo-id', combo.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-combo-id')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('application/x-combo-id')) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const placement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
        onDropCombo(placement);
      }}
      className={`group flex flex-wrap cursor-grab items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-secondary/45 active:cursor-grabbing ${isActive ? 'border-primary/45 bg-primary/12 shadow-sm shadow-primary/10' : 'border-transparent bg-secondary/25'}`}
    >
      <button
        type="button"
        onClick={onLoad}
        aria-label={combo.name}
        aria-pressed={isActive}
        className="flex items-center gap-3 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <LibraryThumbnail combo={combo} />
        <span className="truncate font-display text-base font-semibold text-foreground" title={combo.name}>
          {combo.name}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {combo.assignedDeck && (
          <button
            type="button"
            onClick={onViewDeck}
            className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {isDeckOpen ? 'Hide Deck' : 'Deck'}
          </button>
        )}
        <ComboNotesHoverPreview notes={combo.notes}>
          <button
            type="button"
            onClick={onOpenNotes}
            className={`group/notes relative flex h-8 w-8 items-center justify-center rounded-full border bg-background/50 text-sm transition-colors hover:text-foreground ${
              combo.notes?.trim()
                ? 'border-primary/45 text-primary'
                : 'border-border/60 text-muted-foreground'
            }`}
            aria-label={`Open notes for ${combo.name}`}
            title="Notes"
          >
            <Info className="h-4 w-4" />
          </button>
        </ComboNotesHoverPreview>
        <ComboPreviewButton
          combo={combo}
          onUpdatePreviewCards={onUpdatePreviewCards}
          onOpenPreview={onOpenPreview}
          previewSlotPrefix={previewSlotPrefix}
        />
        <button
          type="button"
          onClick={onStartRename}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 text-sm text-muted-foreground transition-colors hover:text-foreground"
          title="Rename"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          title="Delete"
        >
          ✕
        </button>
      </div>
      <span className={`max-w-[40%] shrink-0 truncate rounded-full border border-current/30 px-3 py-1 text-right font-display text-xs font-semibold ${deckStyle.text}`} title={deckName}>
        {deckName}
      </span>
    </div>
  );
}

export function ComboLibrary({
  currentText,
  currentEndboardSlots,
  currentStepComments,
  currentComboLinks,
  currentCardNotes,
  currentEndboardSlotPrefix,
  activeComboId,
  externalSavedCombo,
  onLoad,
  onSave,
  onCollapse,
}: ComboLibraryProps) {
  const [combos, setCombos] = useState<SavedCombo[]>(getSavedCombos);
  const [saveName, setSaveName] = useState('');
  const [assignDeck, setAssignDeck] = useState(false);
  const [saveDeckName, setSaveDeckName] = useState('');
  const [saveMainDeck, setSaveMainDeck] = useState('');
  const [saveExtraDeck, setSaveExtraDeck] = useState('');
  const [saveSideDeck, setSaveSideDeck] = useState('');
  const [deckErrors, setDeckErrors] = useState<string[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [showAssignExistingDeck, setShowAssignExistingDeck] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [editDeck, setEditDeck] = useState('');
  const [editName, setEditName] = useState('');
  const [editThumbnailCard, setEditThumbnailCard] = useState('');
  const [editSubsectionId, setEditSubsectionId] = useState('');
  const [isRenamingDeck, setIsRenamingDeck] = useState(false);
  const [renameDeckValue, setRenameDeckValue] = useState('');
  const [viewingDeckComboId, setViewingDeckComboId] = useState<string | null>(null);
  const [isViewingSelectedDeck, setIsViewingSelectedDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [deckRevision, setDeckRevision] = useState(0);
  const [isDeckSearchOpen, setIsDeckSearchOpen] = useState(true);
  const [deckThumbnails, setDeckThumbnails] = useState(getDeckThumbnails);
  const [thumbnailDeck, setThumbnailDeck] = useState<string | null>(null);
  const [thumbnailDraft, setThumbnailDraft] = useState('');
  const saveDeckThumbnails = (next: Record<string, string>) => {
    window.localStorage.setItem(DECK_THUMBNAILS_STORAGE_KEY, JSON.stringify(next));
    setDeckThumbnails(next);
  };
  const [libraryView, setLibraryView] = useState<ComboLibraryView>(getInitialComboLibraryView);
  const [selectedSubsection, setSelectedSubsection] = useState(ALL_SUBSECTIONS);
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [inlineSubsectionParent, setInlineSubsectionParent] = useState<{ deckName: string; parentId: string } | null>(null);
  const [inlineSubsectionName, setInlineSubsectionName] = useState('');
  const [inlineRenameSubsection, setInlineRenameSubsection] = useState<{ deckName: string; subsectionId: string } | null>(null);
  const [inlineRenameSubsectionValue, setInlineRenameSubsectionValue] = useState('');
  const [isAddingSubsection, setIsAddingSubsection] = useState(false);
  const [isRenamingSubsection, setIsRenamingSubsection] = useState(false);
  const [renameSubsectionValue, setRenameSubsectionValue] = useState('');
  const [subsectionRevision, setSubsectionRevision] = useState(0);
  const [expandedTreeDeck, setExpandedTreeDeck] = useState<string | null>(null);
  const [expandedTreeSubsections, setExpandedTreeSubsections] = useState<string[]>([]);
  const [draggedComboId, setDraggedComboId] = useState<string | null>(null);
  const [colorPickerDeck, setColorPickerDeck] = useState<string | null>(null);
  const [notesComboId, setNotesComboId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [previewComboId, setPreviewComboId] = useState<string | null>(null);
  const [dataTransferMessage, setDataTransferMessage] = useState('');
  const [, setDeckColorRevision] = useState(0);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const deckOptions = useMemo(() => Array.from(new Set([...getLibraryDeckNames(), ...combos.map(getComboDeckName)]))
    .filter((deck) => deck !== 'Unassigned')
    // The revision invalidates names stored outside React in localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    .sort((a, b) => a.localeCompare(b)), [combos, deckRevision]);
  const [selectedDeck, setSelectedDeck] = useState<string>(getInitialSelectedDeck);
  const selectedDeckSubsections = useMemo(
    () => selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK ? getDeckSubsections(selectedDeck) : [],
    // External subsection storage is invalidated by this revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDeck, subsectionRevision],
  );
  const selectedAssignedDeck = selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK
    ? combos.find((combo) => getComboDeckName(combo) === selectedDeck && combo.assignedDeck)?.assignedDeck
    : undefined;
  const selectedAssignedDeckCombo = selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK
    ? combos.find((combo) => getComboDeckName(combo) === selectedDeck && combo.assignedDeck)
    : undefined;
  const selectedDeckLinkedCombos = selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK
    ? combos.filter((combo) => getComboDeckName(combo) === selectedDeck)
    : [];
  const liveActiveCombo = useMemo(() => {
    if (!activeComboId) return undefined;

    const savedActiveCombo = combos.find((combo) => combo.id === activeComboId) || externalSavedCombo;
    if (!savedActiveCombo) return undefined;

    return {
      ...savedActiveCombo,
      text: currentText,
      endboardSlots: currentEndboardSlots ?? savedActiveCombo.endboardSlots,
      stepComments: currentStepComments ?? savedActiveCombo.stepComments,
      comboLinks: currentComboLinks ?? savedActiveCombo.comboLinks,
      cardNotes: currentCardNotes ?? savedActiveCombo.cardNotes,
    };
  }, [
    activeComboId,
    combos,
    currentCardNotes,
    currentComboLinks,
    currentEndboardSlots,
    currentStepComments,
    currentText,
    externalSavedCombo,
  ]);
  const getPreviewCombo = (combo: SavedCombo): SavedCombo => (
    liveActiveCombo && combo.id === liveActiveCombo.id ? liveActiveCombo : combo
  );
  const fullscreenPreviewBaseCombo = previewComboId
    ? combos.find((combo) => combo.id === previewComboId) || (liveActiveCombo?.id === previewComboId ? liveActiveCombo : undefined)
    : undefined;
  const fullscreenPreviewCombo = fullscreenPreviewBaseCombo ? getPreviewCombo(fullscreenPreviewBaseCombo) : undefined;
  const selectedParentSubsection = selectedDeckSubsections.find((subsection) => subsection.id === selectedSubsection);
  const deckFilteredCombos = selectedDeck === 'all'
    ? combos
    : selectedDeck === UNASSIGNED_DECK
      ? combos.filter((combo) => !combo.assignedDeck && !combo.deck)
      : combos.filter((combo) => getComboDeckName(combo) === selectedDeck);
  const subsectionFilteredCombos = selectedSubsection === ALL_SUBSECTIONS
    ? deckFilteredCombos
    : selectedSubsection === UNCATEGORIZED_SUBSECTION
      ? deckFilteredCombos.filter((combo) => !combo.subsectionId)
      : deckFilteredCombos.filter((combo) => combo.subsectionId === selectedSubsection);
  const visibleCombos = subsectionFilteredCombos.filter((combo) => doesComboMatchSearch(combo, searchQuery));
  const notesCombo = notesComboId ? combos.find((combo) => combo.id === notesComboId) : undefined;
  const hasGithubSeedData = GITHUB_SEED_BACKUP.combos.length > 0 || Object.keys(GITHUB_SEED_BACKUP.subsections).length > 0;
  const compactDeckTree = useMemo(() => deckOptions.flatMap((deckName) => {
    const deckCombos = combos.filter((combo) => getComboDeckName(combo) === deckName);
    const matchingDeckCombos = deckCombos.filter((combo) => doesComboMatchSearch(combo, searchQuery));
    const subsections = getDeckSubsections(deckName);
    const matchesSearch = matchingDeckCombos.length > 0;

    return matchesSearch ? [{ deckName, combos: matchingDeckCombos, subsections }] : [];
  // External subsection storage is invalidated by this revision.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [combos, deckOptions, searchQuery, subsectionRevision]);

  const persistDeckAssignmentForCombos = useCallback((
    deckName: string,
    nextDeck: DeckAssignment,
    sourceCombos: SavedCombo[] = combos,
  ): SavedCombo[] => {
    const affectedComboIds = sourceCombos
      .filter((combo) => getComboDeckName(combo) === deckName)
      .map((combo) => combo.id);
    const updatedCombos = affectedComboIds
      .map((id) => updateCombo(id, { deck: deckName, assignedDeck: nextDeck }))
      .filter((updatedCombo): updatedCombo is SavedCombo => Boolean(updatedCombo));

    if (updatedCombos.length === 0) return sourceCombos;

    return sourceCombos.map((combo) => {
      const updatedCombo = updatedCombos.find((candidate) => candidate.id === combo.id);
      return updatedCombo || combo;
    });
  }, [combos]);

  const buildSharedDeckAssignment = (
    deckName: string,
    sourceCombos: SavedCombo[],
    baseDeck?: DeckAssignment,
  ) => isManualDeck(baseDeck)
    ? Promise.resolve(cloneDeck(baseDeck))
    : createCombinedDeckAssignmentFromTexts(
        deckName,
        sourceCombos.filter((combo) => getComboDeckName(combo) === deckName).map((combo) => combo.text),
        baseDeck,
      );

  useEffect(() => {
    if (!externalSavedCombo) return;

    setCombos((current) => {
      const existingIndex = current.findIndex((combo) => combo.id === externalSavedCombo.id);
      if (existingIndex === -1) {
        return [externalSavedCombo, ...current];
      }

      return current.map((combo) => combo.id === externalSavedCombo.id ? externalSavedCombo : combo);
    });
  }, [externalSavedCombo]);

  useEffect(() => {
    setIsViewingSelectedDeck(false);
    setIsRenamingDeck(false);
    setSelectedSubsection(ALL_SUBSECTIONS);
    setIsAddingSubsection(false);
    setIsRenamingSubsection(false);
  }, [selectedDeck]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMBO_LIBRARY_VIEW_KEY, libraryView);
    } catch {
      // The selected view still works for the current session when storage is unavailable.
    }
  }, [libraryView]);

  useEffect(() => {
    if (selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK && !deckOptions.includes(selectedDeck)) {
      setSelectedDeck('all');
      return;
    }

    try {
      window.localStorage.setItem(COMBO_LIBRARY_DECK_KEY, selectedDeck);
    } catch {
      // The selected deck still works for the current mounted library when storage is unavailable.
    }
  }, [deckOptions, selectedDeck]);

  useEffect(() => {
    if (deckOptions.length === 0) return;

    let isCancelled = false;

    void (async () => {
      let nextCombos = combos;
      let changed = false;

      for (const deckName of deckOptions) {
        const existingDeck = nextCombos.find((combo) => getComboDeckName(combo) === deckName && combo.assignedDeck)?.assignedDeck;
        const sharedDeck = await buildSharedDeckAssignment(deckName, nextCombos, existingDeck);
        if (isCancelled) return;
        const linkedCombos = nextCombos.filter((combo) => getComboDeckName(combo) === deckName);
        const needsUpdate = linkedCombos.some((combo) => !areDeckAssignmentsEqual(combo.assignedDeck, sharedDeck));
        if (!needsUpdate) continue;

        nextCombos = persistDeckAssignmentForCombos(deckName, sharedDeck, nextCombos);
        changed = true;
      }

      if (!isCancelled && changed) {
        setCombos(nextCombos);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [combos, deckOptions, persistDeckAssignmentForCombos]);

  const seedDeckFromCurrentCombo = async () => {
    if (saveMainDeck.trim()) return;
    const deckDraft = await getComboDeckDraftText(currentText);
    setSaveMainDeck(deckDraft.mainText);
    setSaveExtraDeck(deckDraft.extraText);
  };

  const resetDeckDraft = () => {
    setSaveDeckName('');
    setSaveMainDeck('');
    setSaveExtraDeck('');
    setSaveSideDeck('');
    setDeckErrors([]);
  };

  const handleSave = async () => {
    if (!saveName.trim() || !currentText.trim()) return;

    const assignedDeck = assignDeck
      ? await maintainExtraDeckFilter(createDeckAssignment({
          name: saveDeckName,
          mainText: saveMainDeck,
          extraText: saveExtraDeck,
          sideText: saveSideDeck,
        }, { preferExtraDeck: true }))
      : undefined;

    if (assignedDeck) {
      const blockingErrors = getDeckBlockingErrors(assignedDeck);
      if (blockingErrors.length > 0) {
        setDeckErrors(blockingErrors);
        return;
      }
    }

    let combo = saveCombo(assignedDeck?.name || (selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK ? selectedDeck : undefined), saveName.trim(), currentText, assignedDeck, currentEndboardSlots, currentStepComments, currentComboLinks, currentCardNotes);
    let nextCombos = [combo, ...combos];

    if (assignedDeck) {
      const sharedDeck = await buildSharedDeckAssignment(assignedDeck.name, nextCombos, assignedDeck);
      nextCombos = persistDeckAssignmentForCombos(assignedDeck.name, sharedDeck, nextCombos);
      combo = nextCombos.find((candidate) => candidate.id === combo.id) || combo;
    }

    setCombos(nextCombos);
    setSelectedDeck(combo.deck || 'all');
    setSaveName('');
    resetDeckDraft();
    setAssignDeck(false);
    setShowSave(false);
    onSave?.(combo);
  };

  const handleAssignDeckToActiveCombo = async () => {
    if (!activeComboId || !currentText.trim()) return;

    const assignedDeck = await maintainExtraDeckFilter(createDeckAssignment({
      name: saveDeckName,
      mainText: saveMainDeck,
      extraText: saveExtraDeck,
      sideText: saveSideDeck,
    }, { preferExtraDeck: true }));
    const blockingErrors = getDeckBlockingErrors(assignedDeck);

    if (blockingErrors.length > 0) {
      setDeckErrors(blockingErrors);
      return;
    }

    const deckName = assignedDeck.name;
    const combosWithActiveAssignment = combos.map((combo) =>
      combo.id === activeComboId
        ? {
            ...combo,
            deck: deckName,
            subsectionId: getComboDeckName(combo) === deckName ? combo.subsectionId : undefined,
            assignedDeck,
            text: currentText,
          }
        : combo,
    );
    const sharedDeck = await buildSharedDeckAssignment(deckName, combosWithActiveAssignment, assignedDeck);
    const nextCombos = persistDeckAssignmentForCombos(deckName, sharedDeck, combosWithActiveAssignment);
    const updatedCombo = nextCombos.find((combo) => combo.id === activeComboId);
    if (!updatedCombo) return;

    setCombos(nextCombos);
    setSelectedDeck(updatedCombo.deck || 'all');
    resetDeckDraft();
    setShowAssignExistingDeck(false);
    onSave?.(updatedCombo);
  };

  const persistLinkedDeckUpdate = (comboId: string, createNextDeck: (deck: DeckAssignment) => DeckAssignment | null) => {
    const combo = combos.find((currentCombo) => currentCombo.id === comboId);
    if (!combo?.assignedDeck) return;

    const deckName = combo.assignedDeck.name;
    const nextDeck = createNextDeck(combo.assignedDeck);
    if (!nextDeck) return;

    const affectedComboIds = combos
      .filter((currentCombo) => getComboDeckName(currentCombo) === deckName)
      .map((currentCombo) => currentCombo.id);
    const updatedCombos = affectedComboIds
      .map((id) => updateCombo(id, { assignedDeck: nextDeck }))
      .filter((updatedCombo): updatedCombo is SavedCombo => Boolean(updatedCombo));

    if (updatedCombos.length === 0) return;

    setCombos((current) => current.map((currentCombo) => {
      const updatedCombo = updatedCombos.find((candidate) => candidate.id === currentCombo.id);
      return updatedCombo || currentCombo;
    }));

    const activeUpdatedCombo = updatedCombos.find((updatedCombo) => updatedCombo.id === activeComboId);
    if (activeUpdatedCombo) {
      onSave?.(activeUpdatedCombo);
    }
  };

  const handleDeckCardCountChange = (comboId: string, section: DeckSection, cardName: string, count: number) => {
    persistLinkedDeckUpdate(comboId, (deck) => {
      const currentCard = deck[section].find((card) => card.name === cardName);
      if (!currentCard) return null;

      const totalOutsideCard = getCardTotalAcrossDeck(deck, cardName) - currentCard.count;
      const nextCount = Math.min(3 - totalOutsideCard, Math.max(1, count));
      if (nextCount < 1) return null;

      return {
        ...deck,
        [section]: deck[section].map((card) =>
          card.name === cardName
            ? { ...card, count: nextCount }
            : card,
        ),
      };
    });
  };

  const handleDeckCardMove = (comboId: string, sourceSection: DeckSection, cardName: string, targetSection: DeckSection) => {
    persistLinkedDeckUpdate(comboId, (deck) => {
      const sourceCard = deck[sourceSection].find((card) => card.name === cardName);
      if (!sourceCard || sourceSection === targetSection) return null;
      if (getDeckTotal(deck[targetSection]) + sourceCard.count > SECTION_LIMITS[targetSection]) return null;
      if (
        isMainExtraConflict(targetSection, 'main') &&
        sourceSection !== 'main' &&
        deck.main.some((card) => card.name.toLowerCase() === cardName.toLowerCase())
      ) {
        return null;
      }
      if (
        isMainExtraConflict(targetSection, 'extra') &&
        sourceSection !== 'extra' &&
        deck.extra.some((card) => card.name.toLowerCase() === cardName.toLowerCase())
      ) {
        return null;
      }

      const targetCard = deck[targetSection].find((card) => card.name === cardName);
      const nextSourceCards = deck[sourceSection].filter((card) => card.name !== cardName);
      const nextTargetCards = targetCard
        ? deck[targetSection].map((card) =>
            card.name === cardName
              ? { ...card, count: Math.min(3, card.count + sourceCard.count) }
              : card,
          )
        : [...deck[targetSection], sourceCard];

      return {
        ...deck,
        [sourceSection]: sortDeckCards(nextSourceCards),
        [targetSection]: sortDeckCards(nextTargetCards),
      };
    });
  };

  const handleDeckCardAdd = (comboId: string, section: DeckSection, cardName: string) => {
    persistLinkedDeckUpdate(comboId, (deck) => {
      const trimmedName = cardName.trim();
      if (!trimmedName) return null;
      if (getDeckTotal(deck[section]) >= SECTION_LIMITS[section]) return null;
      if (getCardTotalAcrossDeck(deck, trimmedName) >= 3) return null;
      if (isMainExtraConflict(section, 'main') && deck.main.some((card) => card.name.toLowerCase() === trimmedName.toLowerCase())) {
        return null;
      }
      if (isMainExtraConflict(section, 'extra') && deck.extra.some((card) => card.name.toLowerCase() === trimmedName.toLowerCase())) {
        return null;
      }

      const existingCard = deck[section].find((card) => card.name.toLowerCase() === trimmedName.toLowerCase());
      const nextCards = existingCard
        ? deck[section].map((card) =>
            card.name.toLowerCase() === trimmedName.toLowerCase()
              ? { ...card, count: Math.min(3, card.count + 1) }
              : card,
          )
        : [...deck[section], { name: trimmedName, count: 1 }];

      return {
        ...deck,
        [section]: sortDeckCards(nextCards),
      };
    });
  };

  const handleDeckSave = async (comboId: string, nextDeck: DeckAssignment) => {
    const filteredDeck = await maintainExtraDeckFilter(nextDeck);
    const blockingErrors = getDeckBlockingErrors(filteredDeck);
    if (blockingErrors.length > 0) return;
    const savedDeck = validateDeckAssignment(filteredDeck).isValid
      ? { ...filteredDeck, source: 'manual' as const }
      : filteredDeck;
    persistLinkedDeckUpdate(comboId, () => cloneDeck(savedDeck));
  };

  const handleSaveChanges = async () => {
    if (!activeComboId || !currentText.trim()) return;

    const activeCombo = combos.find((combo) => combo.id === activeComboId);
    if (!activeCombo) return;

    let updatedCombo = updateCombo(activeComboId, {
      text: currentText,
      endboardSlots: currentEndboardSlots,
      stepComments: currentStepComments,
      comboLinks: currentComboLinks,
      cardNotes: currentCardNotes,
    });
    if (!updatedCombo) return;

    let nextCombos = combos.map((combo) => combo.id === activeComboId ? updatedCombo : combo);
    const deckName = getComboDeckName(updatedCombo);

    if (deckName !== 'Unassigned') {
      const sharedDeck = await buildSharedDeckAssignment(deckName, nextCombos, updatedCombo.assignedDeck);
      nextCombos = persistDeckAssignmentForCombos(deckName, sharedDeck, nextCombos);
      updatedCombo = nextCombos.find((combo) => combo.id === activeComboId) || updatedCombo;
    }

    setCombos(nextCombos);
    onSave?.(updatedCombo);
  };

  const handleDelete = async (id: string) => {
    const comboToDelete = combos.find((combo) => combo.id === id);
    const deckName = comboToDelete ? getComboDeckName(comboToDelete) : 'Unassigned';
    deleteCombo(id);
    let nextCombos = combos.filter(c => c.id !== id);

    if (deckName !== 'Unassigned' && nextCombos.some((combo) => getComboDeckName(combo) === deckName)) {
      const existingDeck = nextCombos.find((combo) => getComboDeckName(combo) === deckName && combo.assignedDeck)?.assignedDeck;
      const sharedDeck = await buildSharedDeckAssignment(deckName, nextCombos, existingDeck);
      nextCombos = persistDeckAssignmentForCombos(deckName, sharedDeck, nextCombos);
    }

    setCombos(nextCombos);
  };

  const handleDuplicate = (id: string) => {
    const copiedCombo = duplicateCombo(id);
    if (!copiedCombo) return;

    setCombos((current) => [copiedCombo, ...current]);
    setSelectedDeck(copiedCombo.deck || 'all');
    onSave?.(copiedCombo);
  };

  const handleOpenNotes = (combo: SavedCombo) => {
    setNotesComboId(combo.id);
    setNotesDraft(combo.notes || '');
  };

  const handleUpdatePreviewCards = (combo: SavedCombo, field: ComboPreviewCardField, cards: string[]) => {
    const updatedCombo = updateCombo(combo.id, { [field]: cards });
    if (!updatedCombo) return;

    setCombos((current) => current.map((currentCombo) => currentCombo.id === combo.id ? updatedCombo : currentCombo));
    if (activeComboId === combo.id) {
      onSave?.(updatedCombo);
    }
  };

  const handleSaveNotes = () => {
    if (!notesComboId) return;
    const updatedCombo = updateCombo(notesComboId, { notes: notesDraft });
    if (!updatedCombo) return;

    setCombos((current) => current.map((combo) => combo.id === notesComboId ? updatedCombo : combo));
    if (activeComboId === notesComboId) {
      onSave?.(updatedCombo);
    }
    setNotesComboId(null);
    setNotesDraft('');
  };

  const applyLibraryBackup = (backupValue: unknown, successMessage: string) => {
    const imported = importComboLibraryBackup(backupValue);
    setCombos(imported.combos);
    setSubsectionRevision((current) => current + 1);
    setSelectedDeck('all');
    setSelectedSubsection(ALL_SUBSECTIONS);
    setEditingComboId(null);
    setViewingDeckComboId(null);
    setDataTransferMessage(successMessage);
  };

  const handleExportLibraryData = () => {
    const backup = getComboLibraryBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'combo-library-backup.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDataTransferMessage('Downloaded combo-library-backup.json. To ship it with GitHub, replace src/data/combo-library-seed.json with that file.');
  };

  const handleImportLibraryFile = async (file?: File) => {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      applyLibraryBackup(parsed, 'Imported combo library data into this browser.');
    } catch {
      setDataTransferMessage('Could not import that file. Please choose a valid combo-library JSON backup.');
    } finally {
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const handleLoadGithubSeed = () => {
    if (!hasGithubSeedData) return;
    applyLibraryBackup(GITHUB_SEED_BACKUP, 'Loaded combo library data from the GitHub seed files.');
  };

  const handleStartComboRename = (combo: SavedCombo) => {
    setEditingComboId(combo.id);
    setEditDeck(combo.deck || '');
    setEditName(combo.name);
    setEditThumbnailCard(combo.thumbnailCardName || getComboPreviewCardName(combo));
    setEditSubsectionId(combo.subsectionId || '');
  };

  const handleRenameCombo = async () => {
    if (!editingComboId || !editName.trim()) return;
    const existingCombo = combos.find((combo) => combo.id === editingComboId);
    const previousDeckName = existingCombo ? getComboDeckName(existingCombo) : 'Unassigned';
    const previousDeckValue = previousDeckName === 'Unassigned' ? undefined : previousDeckName;
    const nextDeckName = editDeck.trim() || undefined;
    const deckChanged = previousDeckValue !== nextDeckName;
    const subsectionBelongsToNextDeck = !deckChanged && getDeckSubsections(nextDeckName || '').some((subsection) => subsection.id === editSubsectionId);
    let updatedCombo = updateCombo(editingComboId, deckChanged
      ? {
          deck: nextDeckName,
          assignedDeck: null,
          subsectionId: null,
          name: editName.trim(),
          thumbnailCardName: editThumbnailCard,
        }
      : {
          subsectionId: subsectionBelongsToNextDeck ? editSubsectionId : null,
          name: editName.trim(),
          thumbnailCardName: editThumbnailCard,
        });
    if (!updatedCombo) return;

    let nextCombos = combos.map((combo) => combo.id === editingComboId ? updatedCombo : combo);

    if (deckChanged && nextDeckName) {
      const existingDeck = nextCombos.find((combo) => getComboDeckName(combo) === nextDeckName && combo.assignedDeck)?.assignedDeck;
      const sharedDeck = await buildSharedDeckAssignment(nextDeckName, nextCombos, existingDeck);
      nextCombos = persistDeckAssignmentForCombos(nextDeckName, sharedDeck, nextCombos);
      updatedCombo = nextCombos.find((combo) => combo.id === editingComboId) || updatedCombo;
    }

    if (deckChanged && previousDeckName !== 'Unassigned' && nextCombos.some((combo) => getComboDeckName(combo) === previousDeckName)) {
      const existingDeck = nextCombos.find((combo) => getComboDeckName(combo) === previousDeckName && combo.assignedDeck)?.assignedDeck;
      const sharedDeck = await buildSharedDeckAssignment(previousDeckName, nextCombos, existingDeck);
      nextCombos = persistDeckAssignmentForCombos(previousDeckName, sharedDeck, nextCombos);
    }

    setCombos(nextCombos);
    if (activeComboId === editingComboId) {
      onSave?.(updatedCombo);
    }
    setEditingComboId(null);
    setEditDeck('');
    setEditName('');
    setEditThumbnailCard('');
    setEditSubsectionId('');
  };

  const handleRenameDeck = () => {
    if (selectedDeck === 'all' || !renameDeckValue.trim()) return;
    const nextDeckName = renameDeckValue.trim();
    const updatedCombos = renameDeck(selectedDeck, nextDeckName);
    migrateCustomDeckColor(selectedDeck, nextDeckName);
    if (selectedDeck !== nextDeckName && deckThumbnails[selectedDeck]) {
      const next = { ...deckThumbnails, [nextDeckName]: deckThumbnails[selectedDeck] };
      delete next[selectedDeck];
      saveDeckThumbnails(next);
    }
    setCombos(updatedCombos);
    setSelectedDeck(nextDeckName || 'all');
    setIsRenamingDeck(false);
    setRenameDeckValue('');
  };

  const handleDeckColorChange = (deckName: string, colorId?: string) => {
    setCustomDeckColor(deckName, colorId);
    setDeckColorRevision((current) => current + 1);
    setColorPickerDeck(null);
  };

  const handleAddSubsection = () => {
    if (selectedDeck === 'all' || selectedDeck === UNASSIGNED_DECK) return;
    const parentId = selectedParentSubsection?.id;
    const subsection = createDeckSubsection(selectedDeck, newSubsectionName, parentId);
    if (!subsection) return;

    setSubsectionRevision((current) => current + 1);
    if (parentId) {
      const treeKey = `${selectedDeck}:${parentId}`;
      setExpandedTreeSubsections((current) => current.includes(treeKey) ? current : [...current, treeKey]);
    }
    setSelectedSubsection(ALL_SUBSECTIONS);
    setNewSubsectionName('');
    setIsAddingSubsection(false);
  };

  const handleStartInlineSubsection = (deckName: string, parentId: string) => {
    const treeKey = `${deckName}:${parentId}`;
    setExpandedTreeSubsections((current) => current.includes(treeKey) ? current : [...current, treeKey]);
    setInlineSubsectionParent({ deckName, parentId });
    setInlineSubsectionName('');
    setInlineRenameSubsection(null);
    setInlineRenameSubsectionValue('');
    setIsAddingSubsection(false);
    setIsRenamingSubsection(false);
  };

  const handleAddInlineSubsection = () => {
    if (!inlineSubsectionParent) return;

    const subsection = createDeckSubsection(
      inlineSubsectionParent.deckName,
      inlineSubsectionName,
      inlineSubsectionParent.parentId,
    );
    if (!subsection) return;

    const treeKey = `${inlineSubsectionParent.deckName}:${inlineSubsectionParent.parentId}`;
    setExpandedTreeSubsections((current) => current.includes(treeKey) ? current : [...current, treeKey]);
    setSubsectionRevision((current) => current + 1);
    setInlineSubsectionParent(null);
    setInlineSubsectionName('');
  };

  const handleStartInlineRenameSubsection = (deckName: string, subsection: DeckSubsection) => {
    setInlineRenameSubsection({ deckName, subsectionId: subsection.id });
    setInlineRenameSubsectionValue(subsection.name);
    setInlineSubsectionParent(null);
    setInlineSubsectionName('');
    setIsAddingSubsection(false);
    setIsRenamingSubsection(false);
  };

  const handleRenameInlineSubsection = () => {
    if (!inlineRenameSubsection) return;
    const subsection = renameDeckSubsection(
      inlineRenameSubsection.deckName,
      inlineRenameSubsection.subsectionId,
      inlineRenameSubsectionValue,
    );
    if (!subsection) return;

    setSubsectionRevision((current) => current + 1);
    setInlineRenameSubsection(null);
    setInlineRenameSubsectionValue('');
  };

  const handleDeleteInlineSubsection = (deckName: string, subsectionId: string) => {
    const updatedCombos = deleteDeckSubsection(deckName, subsectionId);
    setCombos(updatedCombos);
    setSubsectionRevision((current) => current + 1);
    setExpandedTreeSubsections((current) => current.filter((key) => !key.startsWith(`${deckName}:${subsectionId}`)));
    if (selectedDeck === deckName) {
      setSelectedSubsection(ALL_SUBSECTIONS);
    }
    if (inlineSubsectionParent?.deckName === deckName && inlineSubsectionParent.parentId === subsectionId) {
      setInlineSubsectionParent(null);
      setInlineSubsectionName('');
    }
    if (inlineRenameSubsection?.deckName === deckName && inlineRenameSubsection.subsectionId === subsectionId) {
      setInlineRenameSubsection(null);
      setInlineRenameSubsectionValue('');
    }
  };

  const handleComboDrop = (
    deckName: string,
    subsectionId: string | null | undefined,
    targetComboId?: string,
    placement: ComboDropPlacement = 'after',
  ) => {
    if (!draggedComboId) return;
    const updatedCombos = moveComboInLibrary(draggedComboId, {
      deckName,
      subsectionId,
      beforeComboId: placement === 'before' ? targetComboId : undefined,
      afterComboId: placement === 'after' ? targetComboId : undefined,
    });
    setCombos(updatedCombos);
    setDraggedComboId(null);
  };

  const handleComboSectionDrop = (event: DragEvent<HTMLElement>, deckName: string, subsectionId?: string | null) => {
    if (!event.dataTransfer.types.includes('application/x-combo-id')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    handleComboDrop(deckName, subsectionId || null);
  };

  const handleRenameSubsection = () => {
    if (selectedDeck === 'all' || selectedDeck === UNASSIGNED_DECK) return;
    const subsection = renameDeckSubsection(selectedDeck, selectedSubsection, renameSubsectionValue);
    if (!subsection) return;

    setSubsectionRevision((current) => current + 1);
    setRenameSubsectionValue('');
    setIsRenamingSubsection(false);
  };

  const handleDeleteSubsection = () => {
    if (selectedDeck === 'all' || selectedDeck === UNASSIGNED_DECK) return;
    const updatedCombos = deleteDeckSubsection(selectedDeck, selectedSubsection);
    setCombos(updatedCombos);
    setSubsectionRevision((current) => current + 1);
    setSelectedSubsection(ALL_SUBSECTIONS);
    setIsRenamingSubsection(false);
  };

  const renderCompactComboRows = (rows: SavedCombo[]) => rows.map((combo) => (
    <Fragment key={combo.id}>
      <ComboLibraryCompactRow
        isActive={activeComboId === combo.id}
        combo={getPreviewCombo(combo)}
        isEditing={editingComboId === combo.id}
        editDeck={editDeck}
        editName={editName}
        editSubsectionId={editSubsectionId}
        subsectionOptions={getDeckSubsections(editDeck)}
        onEditDeckChange={setEditDeck}
        onEditNameChange={setEditName}
        onEditSubsectionChange={setEditSubsectionId}
        onRename={handleRenameCombo}
        onLoad={() => onLoad(combo)}
        onViewDeck={() => setViewingDeckComboId((current) => current === combo.id ? null : combo.id)}
        onOpenNotes={() => handleOpenNotes(combo)}
        onUpdatePreviewCards={handleUpdatePreviewCards}
        onOpenPreview={(previewCombo) => setPreviewComboId(previewCombo.id)}
        previewSlotPrefix={combo.id === activeComboId ? currentEndboardSlotPrefix : undefined}
        onDuplicate={() => handleDuplicate(combo.id)}
        onStartRename={() => handleStartComboRename(combo)}
        onDelete={() => handleDelete(combo.id)}
        onDragStart={() => setDraggedComboId(combo.id)}
        onDragEnd={() => setDraggedComboId(null)}
        onDropCombo={(placement) => handleComboDrop(getComboDeckName(combo), combo.subsectionId || null, combo.id, placement)}
        isDeckOpen={viewingDeckComboId === combo.id}
      />
      {viewingDeckComboId === combo.id && combo.assignedDeck && (
        <div className="rounded-2xl bg-background/20 p-3">
          <DeckView
            deck={combo.assignedDeck}
            linkedCombos={combos.filter((linkedCombo) => getComboDeckName(linkedCombo) === combo.assignedDeck?.name)}
            onDeckSave={(nextDeck) => handleDeckSave(combo.id, nextDeck)}
          />
        </div>
      )}
    </Fragment>
  ));

  const renderCompactSubsectionTree = (
    deckName: string,
    deckCombos: SavedCombo[],
    subsections: DeckSubsection[],
  ) => {
    const uncategorizedCombos = deckCombos.filter((combo) => !combo.subsectionId);
    const renderSubsectionNodes = (parentId?: string) => subsections
      .filter((subsection) => (subsection.parentId || '') === (parentId || ''))
      .map((subsection) => {
        const treeKey = `${deckName}:${subsection.id}`;
        const isSubsectionExpanded = expandedTreeSubsections.includes(treeKey);
        const childNodes = renderSubsectionNodes(subsection.id);
        const subsectionCombos = deckCombos.filter((combo) => combo.subsectionId === subsection.id);
        const hasChildren = childNodes.length > 0;

        return (
          <div key={subsection.id} className="space-y-1">
            <div
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('application/x-combo-id')) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(event) => handleComboSectionDrop(event, deckName, subsection.id)}
              className="group flex items-center gap-2 rounded-lg border border-border/50 bg-background/25 px-3 py-2 transition-colors hover:border-primary/35"
            >
              <button
                type="button"
                onClick={() => {
                  setExpandedTreeSubsections((current) =>
                    isSubsectionExpanded
                      ? current.filter((key) => key !== treeKey)
                      : [...current, treeKey],
                  );
                }}
                aria-expanded={isSubsectionExpanded}
                className="flex min-w-0 flex-1 items-center gap-2 text-left font-display text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {isSubsectionExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="truncate">{subsection.name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartInlineSubsection(deckName, subsection.id)}
                aria-label={`Add subsection under ${subsection.name}`}
                className="rounded-full border border-border/60 bg-secondary/50 px-2 py-1 text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground opacity-100 transition-colors hover:border-primary/45 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                + Subsection
              </button>
              <button
                type="button"
                onClick={() => handleStartInlineRenameSubsection(deckName, subsection)}
                aria-label={`Rename subsection ${subsection.name}`}
                className="rounded-full border border-border/60 bg-secondary/50 px-2 py-1 text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground opacity-100 transition-colors hover:border-primary/45 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => handleDeleteInlineSubsection(deckName, subsection.id)}
                aria-label={`Delete subsection ${subsection.name}`}
                className="rounded-full border border-destructive/35 bg-destructive/10 px-2 py-1 text-[10px] font-display font-semibold uppercase tracking-wide text-destructive opacity-100 transition-colors hover:bg-destructive/20 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                Delete
              </button>
            </div>
            {inlineRenameSubsection?.deckName === deckName && inlineRenameSubsection.subsectionId === subsection.id && (
              <div className="ml-4 flex gap-2 border-l border-border/50 pl-3">
                <input
                  value={inlineRenameSubsectionValue}
                  onChange={(event) => setInlineRenameSubsectionValue(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleRenameInlineSubsection()}
                  placeholder={`Rename ${subsection.name}...`}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleRenameInlineSubsection}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInlineRenameSubsection(null);
                    setInlineRenameSubsectionValue('');
                  }}
                  className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
            {inlineSubsectionParent?.deckName === deckName && inlineSubsectionParent.parentId === subsection.id && (
              <div className="ml-4 flex gap-2 border-l border-border/50 pl-3">
                <input
                  value={inlineSubsectionName}
                  onChange={(event) => setInlineSubsectionName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAddInlineSubsection()}
                  placeholder={`Subsection under ${subsection.name}...`}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddInlineSubsection}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
                >
                  Add
                </button>
              </div>
            )}
            {isSubsectionExpanded && (
              <div className="ml-4 space-y-1 border-l border-border/50 pl-3">
                {hasChildren && childNodes}
                {subsectionCombos.length > 0
                  ? renderCompactComboRows(subsectionCombos)
                  : !hasChildren && <p className="px-3 py-2 text-xs text-muted-foreground">No combos in this subsection.</p>}
              </div>
            )}
          </div>
        );
      });

    return (
      <>
        {renderSubsectionNodes()}
        {uncategorizedCombos.length > 0 && (() => {
          const treeKey = `${deckName}:${UNCATEGORIZED_SUBSECTION}`;
          const isSubsectionExpanded = expandedTreeSubsections.includes(treeKey);
          return (
            <div className="space-y-1">
              <button
                type="button"
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes('application/x-combo-id')) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => handleComboSectionDrop(event, deckName, null)}
                onClick={() => {
                  setExpandedTreeSubsections((current) =>
                    isSubsectionExpanded
                      ? current.filter((key) => key !== treeKey)
                      : [...current, treeKey],
                  );
                }}
                aria-expanded={isSubsectionExpanded}
                className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-background/25 px-3 py-2 text-left font-display text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
              >
                {isSubsectionExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>Uncategorized</span>
              </button>
              {isSubsectionExpanded && (
                <div className="ml-4 space-y-1 border-l border-border/50 pl-3">
                  {renderCompactComboRows(uncategorizedCombos)}
                </div>
              )}
            </div>
          );
        })()}
      </>
    );
  };

  return (
    <div className="min-w-0 rounded-xl border border-border/55 bg-card/70 p-3 shadow-lg shadow-black/10 backdrop-blur space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Combo Library</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border/60 bg-secondary/45 px-3 py-1 text-xs font-semibold text-muted-foreground">{visibleCombos.length}</span>
          <button type="button" onClick={() => setShowSave(!showSave)} disabled={!currentText.trim()} aria-label="Save current combo" title="Save current combo" className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="h-3.5 w-3.5" /></button>
          {onCollapse && <button type="button" onClick={onCollapse} aria-label="Collapse combo library" title="Collapse combo library" className="flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      <div className={`grid items-start gap-4 ${isDeckSearchOpen ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-[56px_minmax(0,1fr)]'}`}>
        {isDeckSearchOpen ? (
        <aside aria-label="Library deck search" className="min-w-0 rounded-xl border border-border/55 bg-card/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">Deck Search</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border/60 bg-secondary/45 px-2.5 py-1 text-xs text-muted-foreground">{deckOptions.length}</span>
              <button type="button" onClick={() => { setNewDeckName(''); setIsCreatingDeck(true); }} aria-label="Add deck" title="Add deck" className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary transition-colors hover:bg-primary/20"><Plus className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setIsDeckSearchOpen(false)} aria-label="Collapse deck search" title="Collapse deck search" className="flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search library decks" value={deckSearchQuery} onChange={(event) => setDeckSearchQuery(event.target.value)} placeholder="Find a deck or archetype" className="h-11 w-full rounded-md border border-border bg-background/65 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40" />
          </label>
          <div role="group" aria-label="Deck filters" className="mt-3 flex gap-2">
            {[{ id: 'all', name: 'All Decks' }, { id: UNASSIGNED_DECK, name: 'Unassigned' }].map((filter) => (
              <button key={filter.id} type="button" onClick={() => setSelectedDeck(filter.id)} aria-pressed={selectedDeck === filter.id} className={`rounded-full border px-3 py-1.5 text-xs font-display font-semibold transition-colors ${selectedDeck === filter.id ? 'border-primary/45 bg-primary/12 text-primary' : 'border-border/45 bg-secondary/35 text-muted-foreground hover:text-foreground'}`}>{filter.name}</button>
            ))}
          </div>
          <div role="region" aria-label="Library decks" tabIndex={0} className="deck-search-scroll mt-3 max-h-[clamp(220px,calc(100dvh-320px),680px)] space-y-2 overflow-y-auto rounded-lg border-y border-border/30 py-2 pl-1 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {deckOptions.filter((deck) => deck.toLowerCase().includes(deckSearchQuery.trim().toLowerCase())).map((deck) => {
              const deckCombos = combos.filter((combo) => getComboDeckName(combo) === deck);
              return (
                <div key={deck} className="relative">
                <button type="button" aria-label={`Select deck ${deck}`} aria-pressed={selectedDeck === deck} onClick={() => setSelectedDeck(deck)} className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 ${selectedDeck === deck ? 'border-primary/45 bg-primary/12 shadow-sm shadow-primary/10' : 'border-transparent bg-secondary/25 hover:border-border/60 hover:bg-secondary/55'}`}>
                  <LibraryThumbnail combo={{ ...(deckCombos[0] || { id: deck, name: deck, text: '', createdAt: 0 }), thumbnailCardName: deckThumbnails[deck] || deckCombos[0]?.thumbnailCardName }} />
                  <span className="truncate font-display text-base font-semibold text-foreground">{deck}</span>
                  <span title={`${deckCombos.length} combos`} className="rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground">{deckCombos.length}</span>
                </button>
                <button type="button" aria-label={`Change thumbnail for ${deck}`} title="Change deck thumbnail" onClick={() => { setThumbnailDeck(deck); setThumbnailDraft(deckThumbnails[deck] || ''); }} className="absolute left-3 top-3 flex h-10 w-10 items-end justify-end rounded-lg p-0.5 text-white opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 [@media(hover:none)]:opacity-100"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/50 shadow-sm backdrop-blur-sm"><ImagePlus className="h-3 w-3" /></span></button>
                </div>
              );
            })}
            {!deckOptions.some((deck) => deck.toLowerCase().includes(deckSearchQuery.trim().toLowerCase())) && <p className="p-3 text-sm text-muted-foreground">No decks match your search.</p>}
          </div>
        </aside>
        ) : (
          <aside className="flex items-center justify-center rounded-xl border border-border/55 bg-card/70 p-2">
            <button type="button" onClick={() => setIsDeckSearchOpen(true)} aria-label="Expand deck search" title="Expand deck search" className="flex h-10 w-10 items-center justify-center rounded-full border border-border/55 bg-secondary/60 text-muted-foreground hover:text-foreground"><Search className="h-4 w-4" /></button>
          </aside>
        )}
        <div className="min-w-0 space-y-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search combos"
          placeholder="Find a combo or deck"
          className="h-11 w-full rounded-lg border border-border/70 bg-background/35 pl-10 pr-4 font-body text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/65 focus:border-primary/45 focus:bg-background/55 focus:ring-2 focus:ring-primary/25"
        />
      </label>
      {dataTransferMessage && (
        <p className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">
          {dataTransferMessage}
        </p>
      )}

      {activeComboId && (
        <div className="flex justify-end gap-2">
          <button
            onClick={handleSaveChanges}
            disabled={!currentText.trim()}
            className="px-4 py-1.5 bg-accent/90 text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => {
              const activeCombo = combos.find((combo) => combo.id === activeComboId);
              setShowAssignExistingDeck((current) => !current);
              setShowSave(false);
              setSaveDeckName(activeCombo?.assignedDeck?.name || activeCombo?.deck || '');
              void Promise.all([
                getComboDeckDraftText(currentText),
                activeCombo?.assignedDeck ? maintainExtraDeckFilter(activeCombo.assignedDeck) : Promise.resolve(undefined),
              ]).then(([deckDraft, assignedDeck]) => {
                setSaveMainDeck(assignedDeck?.main.map((card) => `${card.count} ${card.name}`).join('\n') || deckDraft.mainText);
                setSaveExtraDeck(assignedDeck?.extra.map((card) => `${card.count} ${card.name}`).join('\n') || deckDraft.extraText);
                setSaveSideDeck(assignedDeck?.side.map((card) => `${card.count} ${card.name}`).join('\n') || '');
              });
              setDeckErrors([]);
            }}
            disabled={!currentText.trim()}
            className="px-4 py-1.5 bg-secondary/50 border border-border text-muted-foreground font-display font-semibold rounded-lg text-xs hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Assign Deck
          </button>
        </div>
      )}

      {showAssignExistingDeck && activeComboId && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
          <input
            value={saveDeckName}
            onChange={(e) => setSaveDeckName(e.target.value)}
            placeholder="Deck name..."
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Main Deck 40-60</span>
              <textarea
                value={saveMainDeck}
                onChange={(e) => setSaveMainDeck(e.target.value)}
                className="h-32 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Extra Deck 1-15</span>
              <textarea
                value={saveExtraDeck}
                onChange={(e) => setSaveExtraDeck(e.target.value)}
                className="h-32 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Side Deck 0-15</span>
            <textarea
              value={saveSideDeck}
              onChange={(e) => setSaveSideDeck(e.target.value)}
              className="h-24 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>
          {deckErrors.length > 0 && (
            <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-2">
              {deckErrors.map((error) => (
                <p key={error} className="text-xs text-destructive">{error}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAssignExistingDeck(false);
                resetDeckDraft();
              }}
              className="px-4 py-2 bg-secondary/50 border border-border text-muted-foreground font-display font-semibold rounded-lg text-xs hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignDeckToActiveCombo}
              className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
            >
              Save Deck
            </button>
          </div>
        </div>
      )}

      {showSave && (
        <div className="space-y-2">
          <div className="flex gap-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Combo name..."
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
          <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs font-display font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={assignDeck}
              onChange={(e) => {
                const shouldAssignDeck = e.target.checked;
                setAssignDeck(shouldAssignDeck);
                setDeckErrors([]);
                if (shouldAssignDeck) {
                  void seedDeckFromCurrentCombo();
                }
              }}
              className="h-4 w-4 accent-primary"
            />
            Assign a deck to this combo
          </label>
          {assignDeck && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
              <input
                value={saveDeckName}
                onChange={(e) => setSaveDeckName(e.target.value)}
                placeholder="Deck name..."
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Main Deck 40-60</span>
                  <textarea
                    value={saveMainDeck}
                    onChange={(e) => setSaveMainDeck(e.target.value)}
                    placeholder="3 Ash Blossom&#10;1 Reinforcement of the Army"
                    className="h-32 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Extra Deck 1-15</span>
                  <textarea
                    value={saveExtraDeck}
                    onChange={(e) => setSaveExtraDeck(e.target.value)}
                    placeholder="1 Destiny HERO - Destroyer Phoenix Enforcer"
                    className="h-32 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </label>
              </div>
              <label className="space-y-1 block">
                <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">Side Deck 0-15</span>
                <textarea
                  value={saveSideDeck}
                  onChange={(e) => setSaveSideDeck(e.target.value)}
                  placeholder="Optional"
                  className="h-24 w-full resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              {deckErrors.length > 0 && (
                <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-2">
                  {deckErrors.map((error) => (
                    <p key={error} className="text-xs text-destructive">{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {combos.length === 0 && deckOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No saved combos yet. Write a combo and save it!
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">

            {selectedDeck !== 'all' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenamingDeck((current) => !current);
                    setRenameDeckValue(selectedDeck === UNASSIGNED_DECK ? '' : selectedDeck);
                  }}
                  disabled={selectedDeck === UNASSIGNED_DECK}
                  className="px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Rename Deck
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewingSelectedDeck((current) => !current)}
                  disabled={!selectedAssignedDeck}
                  className="px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  View Deck
                </button>
              </>
            )}
          </div>
          {selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
              <span className="text-xs font-display font-semibold text-muted-foreground">Subsection</span>
              <select
                aria-label="Selected subsection"
                value={selectedSubsection}
                onChange={(event) => {
                  setSelectedSubsection(event.target.value);
                  setIsRenamingSubsection(false);
                  setIsAddingSubsection(false);
                }}
                className="min-w-[180px] rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={ALL_SUBSECTIONS}>All subsections</option>
                <option value={UNCATEGORIZED_SUBSECTION}>Uncategorized</option>
                {selectedDeckSubsections.map((subsection) => (
                  <option key={subsection.id} value={subsection.id}>{getSubsectionOptionLabel(subsection, selectedDeckSubsections)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsAddingSubsection((current) => !current);
                  setIsRenamingSubsection(false);
                }}
                className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {selectedParentSubsection ? 'Add Nested Subsection' : 'Add Subsection'}
              </button>
              {selectedDeckSubsections.some((subsection) => subsection.id === selectedSubsection) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const subsection = selectedDeckSubsections.find((candidate) => candidate.id === selectedSubsection);
                      setRenameSubsectionValue(subsection?.name || '');
                      setIsRenamingSubsection((current) => !current);
                      setIsAddingSubsection(false);
                    }}
                    className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSubsection}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-display font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
          {isAddingSubsection && selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK && (
            <div className="flex gap-2">
              <input
                value={newSubsectionName}
                onChange={(event) => setNewSubsectionName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAddSubsection()}
                placeholder={selectedParentSubsection ? `Subsection under ${selectedParentSubsection.name}...` : 'Subsection name, e.g. 2-card combos...'}
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddSubsection}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
              >
                Add
              </button>
            </div>
          )}
          {isRenamingSubsection && selectedDeckSubsections.some((subsection) => subsection.id === selectedSubsection) && (
            <div className="flex gap-2">
              <input
                value={renameSubsectionValue}
                onChange={(event) => setRenameSubsectionValue(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleRenameSubsection()}
                placeholder="Subsection name..."
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRenameSubsection}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-display font-semibold text-accent-foreground transition-all hover:brightness-110"
              >
                Save
              </button>
            </div>
          )}
          {isViewingSelectedDeck && selectedAssignedDeck && (
            <DeckView
              deck={selectedAssignedDeck}
              linkedCombos={selectedDeckLinkedCombos}
              onDeckSave={selectedAssignedDeckCombo
                ? (nextDeck) => handleDeckSave(selectedAssignedDeckCombo.id, nextDeck)
                : undefined}
            />
          )}
          {isRenamingDeck && selectedDeck !== 'all' && selectedDeck !== UNASSIGNED_DECK && (
            <div className="flex gap-2">
              <input
                value={renameDeckValue}
                onChange={(e) => setRenameDeckValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameDeck()}
                placeholder="New deck name..."
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={handleRenameDeck}
                className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
              >
                Save
              </button>
            </div>
          )}
          <div role="region" aria-label="Combo library results" tabIndex={0} className="deck-search-scroll max-h-[clamp(220px,calc(100dvh-320px),680px)] overflow-y-auto rounded-lg border-y border-border/30 py-2 pl-1 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {visibleCombos.length === 0 ? (
              <p className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-5 text-center text-xs text-muted-foreground">
                {searchQuery.trim() ? 'No combos match your search.' : 'No saved combos for this deck yet.'}
              </p>
            ) : (
              libraryView === 'search' ? (
                <div className="space-y-2">{renderCompactComboRows(visibleCombos)}</div>
              ) : libraryView === 'compact' ? (
                <div className="space-y-1">
                  {selectedDeck === 'all' ? compactDeckTree.map(({ deckName, combos: deckCombos, subsections }) => {
                    const isDeckExpanded = expandedTreeDeck === deckName;
                    const deckStyle = getDeckNameStyle(deckName);
                    const customColorId = getCustomDeckColors()[deckName];

                    return (
                      <div key={deckName} className="space-y-1">
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/50">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedTreeDeck(isDeckExpanded ? null : deckName);
                              setExpandedTreeSubsections([]);
                            }}
                            aria-expanded={isDeckExpanded}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left font-display text-sm font-semibold text-foreground"
                          >
                            {isDeckExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className={`truncate ${deckStyle.text}`}>{deckName}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorPickerDeck((current) => current === deckName ? null : deckName)}
                            aria-label={`Change ${deckName} color`}
                            aria-expanded={colorPickerDeck === deckName}
                            className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[10px] font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Color
                          </button>
                        </div>
                        {colorPickerDeck === deckName && (
                          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/35 p-3">
                            <button
                              type="button"
                              onClick={() => handleDeckColorChange(deckName)}
                              aria-pressed={!customColorId}
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-display font-semibold transition-colors ${
                                !customColorId
                                  ? 'border-primary/50 bg-primary/15 text-primary'
                                  : 'border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Automatic
                            </button>
                            {DECK_NAME_STYLES.map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                onClick={() => handleDeckColorChange(deckName, style.id)}
                                aria-label={`Set ${deckName} color to ${style.label}`}
                                aria-pressed={customColorId === style.id}
                                title={style.label}
                                className={`h-7 w-7 rounded-full border-2 ${style.swatch} transition-transform hover:scale-110 ${
                                  customColorId === style.id ? 'border-white ring-2 ring-primary/60' : 'border-white/20'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {isDeckExpanded && (
                          <div className="ml-4 space-y-1 border-l border-border/60 pl-3">
                            {subsections.length === 0 ? renderCompactComboRows(deckCombos) : (
                              renderCompactSubsectionTree(deckName, deckCombos, subsections)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }) : selectedDeckSubsections.length > 0 && selectedSubsection === ALL_SUBSECTIONS
                    ? renderCompactSubsectionTree(selectedDeck, visibleCombos, selectedDeckSubsections)
                    : renderCompactComboRows(visibleCombos)}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleCombos.map((combo) => (
                    <Fragment key={combo.id}>
                      <ComboLibraryCard
                        combo={getPreviewCombo(combo)}
                        isEditing={editingComboId === combo.id}
                        editDeck={editDeck}
                        editName={editName}
                        editThumbnailCard={editThumbnailCard}
                        editSubsectionId={editSubsectionId}
                        subsectionOptions={getDeckSubsections(editDeck)}
                        onEditDeckChange={setEditDeck}
                        onEditNameChange={setEditName}
                        onEditThumbnailCardChange={setEditThumbnailCard}
                        onEditSubsectionChange={setEditSubsectionId}
                        onRename={handleRenameCombo}
                        onLoad={() => onLoad(combo)}
                        onViewDeck={() => setViewingDeckComboId((current) => current === combo.id ? null : combo.id)}
                        onOpenNotes={() => handleOpenNotes(combo)}
                        onUpdatePreviewCards={handleUpdatePreviewCards}
                        onOpenPreview={(previewCombo) => setPreviewComboId(previewCombo.id)}
                        previewSlotPrefix={combo.id === activeComboId ? currentEndboardSlotPrefix : undefined}
                        onDuplicate={() => handleDuplicate(combo.id)}
                        onStartRename={() => handleStartComboRename(combo)}
                        onDelete={() => handleDelete(combo.id)}
                        isDeckOpen={viewingDeckComboId === combo.id}
                      />
                      {viewingDeckComboId === combo.id && combo.assignedDeck && (
                        <div className="col-span-full rounded-2xl bg-background/20 p-3">
                          <DeckView
                            deck={combo.assignedDeck}
                            linkedCombos={combos.filter((linkedCombo) => getComboDeckName(linkedCombo) === combo.assignedDeck?.name)}
                            onDeckSave={(nextDeck) => handleDeckSave(combo.id, nextDeck)}
                          />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setLibraryView('search')} aria-label="Show thumbnail list view" aria-pressed={libraryView === 'search'} className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 ${libraryView === 'search' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}><List className="h-4 w-4" /></button>
          <div className="flex rounded-lg border border-border/70 bg-background/35 p-1" aria-label="Combo library view">
            <button
              type="button"
              onClick={() => setLibraryView('cards')}
              aria-label="Show card view"
              aria-pressed={libraryView === 'cards'}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${libraryView === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setLibraryView('compact');
                setEditingComboId(null);
                setViewingDeckComboId(null);
              }}
              aria-label="Show compact list view"
              aria-pressed={libraryView === 'compact'}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${libraryView === 'compact' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExportLibraryData}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Export Data
          </button>
          <button
            type="button"
            onClick={() => importFileInputRef.current?.click()}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Import Data
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportLibraryFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={handleLoadGithubSeed}
            disabled={!hasGithubSeedData}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title={hasGithubSeedData ? 'Load committed seed data from src/data' : 'Replace src/data/combo-library-seed.json with an exported backup first'}
          >
            Load GitHub Data
          </button>

        </div>
      </div>

        </div>
      </div>
      <Dialog open={isCreatingDeck} onOpenChange={setIsCreatingDeck}>
        <DialogContent>
          <DialogTitle>Create deck</DialogTitle>
          <DialogDescription>Name your new deck. You can save combos to it afterward.</DialogDescription>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const name = newDeckName.trim();
            if (!name || ['all', UNASSIGNED_DECK, 'unassigned'].includes(name.toLowerCase()) || deckOptions.some((deck) => deck.toLowerCase() === name.toLowerCase())) return;
            createLibraryDeck(name);
            setDeckRevision((current) => current + 1);
            setSelectedDeck(name);
            setSelectedSubsection(ALL_SUBSECTIONS);
            setDeckSearchQuery('');
            setSearchQuery('');
            setIsCreatingDeck(false);
          }}>
            <input autoFocus aria-label="New deck name" value={newDeckName} onChange={(event) => setNewDeckName(event.target.value)} placeholder="Deck name" className="h-11 w-full rounded-md border border-border bg-background/65 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            {newDeckName.trim() && (['all', UNASSIGNED_DECK, 'unassigned'].includes(newDeckName.trim().toLowerCase()) || deckOptions.some((deck) => deck.toLowerCase() === newDeckName.trim().toLowerCase())) && <p role="alert" className="text-sm text-destructive">Choose a different deck name; this name is already in use.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreatingDeck(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={!newDeckName.trim()} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-40">Create deck</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={thumbnailDeck !== null} onOpenChange={(open) => { if (!open) setThumbnailDeck(null); }}>
        <DialogContent>
          <DialogTitle>Deck thumbnail for {thumbnailDeck}</DialogTitle>
          <DialogDescription>Choose a card name for this deck’s image. Leave it blank to use the automatic thumbnail.</DialogDescription>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!thumbnailDeck) return;
            const next = { ...deckThumbnails };
            if (thumbnailDraft.trim()) next[thumbnailDeck] = thumbnailDraft.trim();
            else delete next[thumbnailDeck];
            saveDeckThumbnails(next);
            setThumbnailDeck(null);
          }} className="space-y-4">
            <input autoFocus aria-label="Deck thumbnail card name" placeholder="Card name, e.g. Fallen of Albaz" value={thumbnailDraft} onChange={(event) => setThumbnailDraft(event.target.value)} className="h-11 w-full rounded-md border border-border bg-background/65 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            {thumbnailDraft.trim() && <LibraryThumbnail combo={{ id: 'preview', name: thumbnailDraft, text: '', createdAt: 0, thumbnailCardName: thumbnailDraft }} />}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setThumbnailDeck(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Save thumbnail</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(notesCombo)}
        onOpenChange={(open) => {
          if (open) return;
          setNotesComboId(null);
          setNotesDraft('');
        }}
      >
        <DialogContent className="max-w-2xl border-border bg-background/95 p-6 text-foreground shadow-2xl backdrop-blur">
          <DialogTitle className="font-display text-2xl font-semibold">
            Notes for {notesCombo?.name || 'combo'}
          </DialogTitle>
          <DialogDescription>
            View or write private notes for this saved combo.
          </DialogDescription>
          <div className="mt-4 space-y-3">
            <textarea
              aria-label="Combo notes"
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              placeholder="Write matchup notes, reminders, restrictions, alternate lines..."
              className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-secondary/45 px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {notesDraft.trim() ? `${notesDraft.trim().length} characters` : 'No notes yet'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotesComboId(null);
                    setNotesDraft('');
                  }}
                  className="rounded-xl border border-border/70 bg-secondary/40 px-4 py-2 text-sm font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-display font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(fullscreenPreviewCombo)}
        onOpenChange={(open) => {
          if (open) return;
          setPreviewComboId(null);
        }}
      >
        <DialogContent className="flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col border-border bg-background/95 p-5 text-foreground shadow-2xl backdrop-blur">
          <div className="shrink-0">
            <DialogTitle className="font-display text-2xl font-semibold">
              Preview for {fullscreenPreviewCombo?.name || 'combo'}
            </DialogTitle>
            <DialogDescription>
              Review the saved endboard, plays-around cards, and required cards for this combo.
            </DialogDescription>
          </div>
          {fullscreenPreviewCombo && (
            <div className="mt-4 min-h-0 flex-1">
              <ComboPreviewContent
                combo={fullscreenPreviewCombo}
                onUpdatePreviewCards={handleUpdatePreviewCards}
                previewSlotPrefix={fullscreenPreviewCombo.id === activeComboId ? currentEndboardSlotPrefix : undefined}
                isFullscreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
