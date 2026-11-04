import type { PersistedEndboardSlots } from '@/lib/endboard';

export type DeckTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rogue' | 'Low Tier';
export type ImpactRating = 'High' | 'Medium' | 'Low';
export type CounterCardCategory = 'Handtrap' | 'Board breaker' | 'Side card';

export interface CounterDeck {
  id: string;
  name: string;
  tier: DeckTier;
  thumbnailCardName?: string;
  endboard: string[];
  endboardSlots?: PersistedEndboardSlots;
  cardNotes?: Record<string, string>;
  plan: string;
}

export interface CounterCard {
  id: string;
  name: string;
  category: CounterCardCategory;
}

export interface CounterPairing {
  id: string;
  deckId: string;
  counterCardId?: string;
  counterCardIds?: string[];
  counteredCard: string;
  counteredCards?: string[];
  impact: ImpactRating;
  summary: string;
  timing: string;
  tags: string[];
}

export interface CounterComment {
  id: string;
  pairingId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface HandtrapStatistic {
  counterCard: CounterCard;
  totalDecks: number;
  totalPairings: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  tierCounts: Record<DeckTier, number>;
  weightedScore: number;
  summary: string;
}

export interface CounterGuideData {
  decks: CounterDeck[];
  counterCards: CounterCard[];
  pairings: CounterPairing[];
}

export const DECK_TIERS: DeckTier[] = ['Tier 1', 'Tier 2', 'Tier 3', 'Rogue', 'Low Tier'];
export const IMPACT_RATINGS: ImpactRating[] = ['High', 'Medium', 'Low'];
export const COUNTER_CARD_CATEGORIES: CounterCardCategory[] = ['Handtrap', 'Board breaker', 'Side card'];

export const TIER_WEIGHT: Record<DeckTier, number> = {
  'Tier 1': 5,
  'Tier 2': 4,
  'Tier 3': 3,
  Rogue: 2,
  'Low Tier': 1,
};

export const IMPACT_WEIGHT: Record<ImpactRating, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const COUNTER_TIER_OVERRIDES_STORAGE_KEY = 'ygo-counter-guide-tier-overrides';
const COUNTER_COMMENTS_STORAGE_KEY = 'ygo-counter-guide-comments';
const COUNTER_GUIDE_DATA_STORAGE_KEY = 'ygo-counter-guide-data';

export const COUNTER_CARDS: CounterCard[] = [
  { id: 'ash-blossom', name: 'Ash Blossom & Joyous Spring', category: 'Handtrap' },
  { id: 'droll-lock-bird', name: 'Droll & Lock Bird', category: 'Handtrap' },
  { id: 'effect-veiler', name: 'Effect Veiler', category: 'Handtrap' },
  { id: 'infinite-imperm', name: 'Infinite Impermanence', category: 'Handtrap' },
  { id: 'nibiru', name: 'Nibiru, the Primal Being', category: 'Handtrap' },
  { id: 'ghost-belle', name: 'Ghost Belle & Haunted Mansion', category: 'Handtrap' },
  { id: 'dd-crow', name: 'D.D. Crow', category: 'Handtrap' },
  { id: 'dimension-shifter', name: 'Dimension Shifter', category: 'Handtrap' },
  { id: 'dark-ruler', name: 'Dark Ruler No More', category: 'Board breaker' },
  { id: 'forbidden-droplet', name: 'Forbidden Droplet', category: 'Board breaker' },
  { id: 'evenly-matched', name: 'Evenly Matched', category: 'Board breaker' },
  { id: 'cosmic-cyclone', name: 'Cosmic Cyclone', category: 'Side card' },
  { id: 'dimensional-barrier', name: 'Dimensional Barrier', category: 'Side card' },
  { id: 'artifact-lancea', name: 'Artifact Lancea', category: 'Handtrap' },
];

export const COUNTER_DECKS: CounterDeck[] = [
  {
    id: 'ryzeal',
    name: 'Ryzeal',
    tier: 'Tier 1',
    thumbnailCardName: 'Ryzeal Detonator',
    endboard: ['Ryzeal Detonator', 'Ryzeal Cross', 'Number 41: Bagooska the Terribly Tired Tapir'],
    plan: 'Compact Rank 4 boards backed by layered disruption and follow-up.',
  },
  {
    id: 'maliss',
    name: 'Maliss',
    tier: 'Tier 1',
    thumbnailCardName: 'M∀LICE <Q> RED RANSOM',
    endboard: ['M∀LICE <Q> RED RANSOM', 'M∀LICE <Q> WHITE BINDER', 'M∀LICE IN UNDERGROUND'],
    plan: 'Link climbs through banish triggers, then converts recursion into traps and interaction.',
  },
  {
    id: 'snake-eye-fire-king',
    name: 'Snake-Eye Fire King',
    tier: 'Tier 2',
    thumbnailCardName: 'Snake-Eye Ash',
    endboard: ['Promethean Princess, Bestower of Flames', 'I:P Masquerena', 'Fire King High Avatar Kirin'],
    plan: 'Turns small starters into graveyard recursion, destruction triggers, and flexible link interaction.',
  },
  {
    id: 'tenpai-dragon',
    name: 'Tenpai Dragon',
    tier: 'Tier 2',
    thumbnailCardName: 'Sangenpai Transcendent Dragion',
    endboard: ['Sangen Summoning', 'Sangenpai Transcendent Dragion', 'Trident Dragion'],
    plan: 'Forces the Battle Phase, protects its lines, and turns one opening into lethal damage.',
  },
  {
    id: 'white-forest-azamina',
    name: 'White Forest Azamina',
    tier: 'Tier 3',
    thumbnailCardName: 'Diabell, Queen of the White Forest',
    endboard: ['Diabell, Queen of the White Forest', 'The Hallowed Azamina', 'Sinful Spoils of the White Forest'],
    plan: 'Trades spells and traps for tuners, synchro pressure, and Azamina interruptions.',
  },
  {
    id: 'labrynth',
    name: 'Labrynth',
    tier: 'Tier 3',
    thumbnailCardName: 'Lovely Labrynth of the Silver Castle',
    endboard: ['Lovely Labrynth of the Silver Castle', 'Big Welcome Labrynth', 'Welcome Labrynth'],
    plan: 'Sets trap pressure, removes cards without targeting, and snowballs once traps resolve.',
  },
  {
    id: 'branded-despia',
    name: 'Branded Despia',
    tier: 'Rogue',
    thumbnailCardName: 'Mirrorjade the Iceblade Dragon',
    endboard: ['Mirrorjade the Iceblade Dragon', 'Branded Lost', 'Branded in Red'],
    plan: 'Fusion value deck that converts one starter into Mirrorjade plus graveyard follow-up.',
  },
  {
    id: 'hero',
    name: 'HERO',
    tier: 'Low Tier',
    thumbnailCardName: 'Elemental HERO Stratos',
    endboard: ['Destiny HERO - Destroyer Phoenix Enforcer', 'Masked HERO Dark Law', 'Elemental HERO Sunrise'],
    plan: 'Linear combo deck that searches aggressively and tries to end on floodgate pressure.',
  },
];

export const COUNTER_PAIRINGS: CounterPairing[] = [
  {
    id: 'ryzeal-imperm-detonator',
    deckId: 'ryzeal',
    counterCardId: 'infinite-imperm',
    counteredCard: 'Ryzeal Detonator',
    impact: 'High',
    summary: 'Use on the first committed Rank 4 payoff or the monster that converts into it.',
    timing: 'Best before the deck has converted bodies into a protected Xyz plus backrow.',
    tags: ['monster negate', 'endboard breaker'],
  },
  {
    id: 'ryzeal-nibiru-field',
    deckId: 'ryzeal',
    counterCardId: 'nibiru',
    counteredCard: 'Ryzeal Detonator',
    impact: 'Medium',
    summary: 'Punishes lines that extend past five summons before a negate is established.',
    timing: 'Track summons carefully; weaker if they choose a conservative line.',
    tags: ['summon punish', 'board wipe'],
  },
  {
    id: 'ryzeal-ash-search',
    deckId: 'ryzeal',
    counterCardId: 'ash-blossom',
    counteredCard: 'Ryzeal Cross',
    impact: 'Medium',
    summary: 'Stops the search or deck access point, but does not always end the turn alone.',
    timing: 'Hold it for the first card that clearly accesses engine from deck.',
    tags: ['search stop'],
  },
  {
    id: 'maliss-lancea-banish',
    deckId: 'maliss',
    counterCardId: 'artifact-lancea',
    counteredCard: 'M∀LICE IN UNDERGROUND',
    impact: 'High',
    summary: 'Shuts off the banish-based extension that lets the deck keep climbing.',
    timing: 'Use early in the turn before the first banish trigger chain creates extra bodies.',
    tags: ['banish lock', 'turn stopper'],
  },
  {
    id: 'maliss-dd-crow-grave',
    deckId: 'maliss',
    counterCardId: 'dd-crow',
    counteredCard: 'M∀LICE <Q> WHITE BINDER',
    impact: 'Medium',
    summary: 'Removes the target they are trying to recur or convert into link material.',
    timing: 'Wait until the relevant target is declared or becomes mandatory for continuation.',
    tags: ['graveyard interruption'],
  },
  {
    id: 'maliss-droll-search',
    deckId: 'maliss',
    counterCardId: 'droll-lock-bird',
    counteredCard: 'M∀LICE <Q> RED RANSOM',
    impact: 'High',
    summary: 'Cuts off repeated adding and makes the endboard much less layered.',
    timing: 'Fire immediately after the first successful add from deck to hand.',
    tags: ['search lock'],
  },
  {
    id: 'snake-eye-ghost-belle-princess',
    deckId: 'snake-eye-fire-king',
    counterCardId: 'ghost-belle',
    counteredCard: 'Promethean Princess, Bestower of Flames',
    impact: 'High',
    summary: 'Stops a graveyard summon that usually represents both extension and interaction.',
    timing: 'Use when Princess or another graveyard effect attempts to summon back a monster.',
    tags: ['graveyard negate'],
  },
  {
    id: 'snake-eye-dd-crow-target',
    deckId: 'snake-eye-fire-king',
    counterCardId: 'dd-crow',
    counteredCard: 'Promethean Princess, Bestower of Flames',
    impact: 'Medium',
    summary: 'Banishes the graveyard target and can strand link lines without enough material.',
    timing: 'Wait for the graveyard effect target so the Crow trades cleanly.',
    tags: ['graveyard interruption'],
  },
  {
    id: 'snake-eye-imperm-ip',
    deckId: 'snake-eye-fire-king',
    counterCardId: 'infinite-imperm',
    counteredCard: 'I:P Masquerena',
    impact: 'Medium',
    summary: 'Trades into the endboard interaction if you can force it on your turn.',
    timing: 'Use before committing your normal summon when possible.',
    tags: ['endboard breaker'],
  },
  {
    id: 'tenpai-droll-search',
    deckId: 'tenpai-dragon',
    counterCardId: 'droll-lock-bird',
    counteredCard: 'Sangen Summoning',
    impact: 'High',
    summary: 'Prevents the hand from snowballing through repeated dragon access.',
    timing: 'Use after their first successful add; it is often better than spending Ash early.',
    tags: ['search lock'],
  },
  {
    id: 'tenpai-droplet-battle',
    deckId: 'tenpai-dragon',
    counterCardId: 'forbidden-droplet',
    counteredCard: 'Sangenpai Transcendent Dragion',
    impact: 'High',
    summary: 'Turns off the battle-phase payoff so the push loses its lethal texture.',
    timing: 'Use once the important synchro or protected attacker is committed.',
    tags: ['battle phase', 'board breaker'],
  },
  {
    id: 'tenpai-cosmic-field',
    deckId: 'tenpai-dragon',
    counterCardId: 'cosmic-cyclone',
    counteredCard: 'Sangen Summoning',
    impact: 'Medium',
    summary: 'Removes the field spell cleanly and avoids graveyard recursion.',
    timing: 'Use before Battle Phase pressure starts or in response to field-spell reliance.',
    tags: ['spell removal'],
  },
  {
    id: 'white-forest-ash-spoils',
    deckId: 'white-forest-azamina',
    counterCardId: 'ash-blossom',
    counteredCard: 'Sinful Spoils of the White Forest',
    impact: 'Medium',
    summary: 'Stops key deck access but can be baited by redundant starters.',
    timing: 'Aim for the effect that turns a discard into the missing engine piece.',
    tags: ['search stop'],
  },
  {
    id: 'white-forest-veiler-diabell',
    deckId: 'white-forest-azamina',
    counterCardId: 'effect-veiler',
    counteredCard: 'Diabell, Queen of the White Forest',
    impact: 'High',
    summary: 'Cuts off a central monster effect without needing to interact with the graveyard.',
    timing: 'Use on the monster effect that converts into synchro or Azamina access.',
    tags: ['monster negate'],
  },
  {
    id: 'white-forest-dbarrier-synchro',
    deckId: 'white-forest-azamina',
    counterCardId: 'dimensional-barrier',
    counteredCard: 'Diabell, Queen of the White Forest',
    impact: 'High',
    summary: 'Calling Synchro can blank the turn if their line is already committed.',
    timing: 'Best after they spend resources toward tuner access.',
    tags: ['summon lock'],
  },
  {
    id: 'lab-cosmic-welcome',
    deckId: 'labrynth',
    counterCardId: 'cosmic-cyclone',
    counteredCard: 'Big Welcome Labrynth',
    impact: 'High',
    summary: 'Banishes the trap before it can generate recursive advantage.',
    timing: 'Use on activation or before they can protect the trap line.',
    tags: ['trap removal'],
  },
  {
    id: 'lab-ash-welcome',
    deckId: 'labrynth',
    counterCardId: 'ash-blossom',
    counteredCard: 'Welcome Labrynth',
    impact: 'Medium',
    summary: 'Stops the deck summon, though set traps may still carry the turn.',
    timing: 'Use on Welcome effects that summon from deck.',
    tags: ['deck summon stop'],
  },
  {
    id: 'lab-evenly-board',
    deckId: 'labrynth',
    counterCardId: 'evenly-matched',
    counteredCard: 'Lovely Labrynth of the Silver Castle',
    impact: 'Medium',
    summary: 'Forces them to choose between traps and monsters, but timing can be awkward into set interaction.',
    timing: 'Enter Battle Phase cleanly; watch for traps that remove it before resolution.',
    tags: ['board breaker'],
  },
  {
    id: 'branded-ash-fusion',
    deckId: 'branded-despia',
    counterCardId: 'ash-blossom',
    counteredCard: 'Branded Fusion',
    impact: 'High',
    summary: 'Stops the main one-card engine conversion and often forces a much weaker endboard.',
    timing: 'Use directly on Branded Fusion unless Branded Lost changes the interaction window.',
    tags: ['fusion stop'],
  },
  {
    id: 'branded-belle-red',
    deckId: 'branded-despia',
    counterCardId: 'ghost-belle',
    counteredCard: 'Branded in Red',
    impact: 'Medium',
    summary: 'Stops graveyard add-back or summon effects that enable the interruption chain.',
    timing: 'Use when they target a graveyard monster for Branded in Red.',
    tags: ['graveyard negate'],
  },
  {
    id: 'branded-dbarrier-fusion',
    deckId: 'branded-despia',
    counterCardId: 'dimensional-barrier',
    counteredCard: 'Mirrorjade the Iceblade Dragon',
    impact: 'High',
    summary: 'Calling Fusion prevents the deck from converting starters into Mirrorjade.',
    timing: 'Use before they resolve the fusion spell, especially after they commit discard costs.',
    tags: ['summon lock'],
  },
  {
    id: 'hero-droll-search',
    deckId: 'hero',
    counterCardId: 'droll-lock-bird',
    counteredCard: 'Elemental HERO Stratos',
    impact: 'High',
    summary: 'HERO needs repeated searches; Droll often compresses the turn into one weak body.',
    timing: 'Use after the first successful add from deck to hand.',
    tags: ['search lock'],
  },
  {
    id: 'hero-imperm-dark-law',
    deckId: 'hero',
    counterCardId: 'infinite-imperm',
    counteredCard: 'Masked HERO Dark Law',
    impact: 'Medium',
    summary: 'Breaks the floodgate long enough to play through the board.',
    timing: 'Use at the start of your turn before graveyard-reliant actions.',
    tags: ['floodgate answer'],
  },
  {
    id: 'hero-nibiru-combo',
    deckId: 'hero',
    counterCardId: 'nibiru',
    counteredCard: 'Elemental HERO Sunrise',
    impact: 'Medium',
    summary: 'Punishes full combo lines if they cannot put up protection in time.',
    timing: 'Wait until the final extender before a negate or Dark Law line appears.',
    tags: ['summon punish'],
  },
];

export const DEFAULT_COUNTER_GUIDE_DATA: CounterGuideData = {
  decks: COUNTER_DECKS,
  counterCards: COUNTER_CARDS,
  pairings: COUNTER_PAIRINGS.map((pairing) => ({
    ...pairing,
    counterCardIds: getPairingCounterCardIds(pairing),
    counteredCards: getPairingCounteredCards(pairing),
  })),
};

function emptyTierCounts(): Record<DeckTier, number> {
  return {
    'Tier 1': 0,
    'Tier 2': 0,
    'Tier 3': 0,
    Rogue: 0,
    'Low Tier': 0,
  };
}

function normalizeSearchValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeDeckTier(value: unknown): DeckTier | null {
  if (value === 'Rogue Tier') return 'Rogue';
  return typeof value === 'string' && DECK_TIERS.includes(value as DeckTier) ? value as DeckTier : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeId(value: string, fallbackPrefix: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return sanitized || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function createCounterGuideId(value: string, fallbackPrefix: string): string {
  return sanitizeId(value, fallbackPrefix);
}

export function getPairingCounterCardIds(pairing: CounterPairing): string[] {
  const ids = Array.isArray(pairing.counterCardIds) ? pairing.counterCardIds : [];
  const legacyId = pairing.counterCardId ? [pairing.counterCardId] : [];
  return Array.from(new Set([...ids, ...legacyId].filter(Boolean)));
}

export function getPairingCounteredCards(pairing: CounterPairing): string[] {
  const cards = Array.isArray(pairing.counteredCards) ? pairing.counteredCards : [];
  const legacyCard = pairing.counteredCard ? [pairing.counteredCard] : [];
  const seen = new Set<string>();

  return [...cards, ...legacyCard].flatMap((cardName) => {
    const key = cardName.trim().toLowerCase();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [cardName];
  });
}

function normalizeCardNotes(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const notes = Object.entries(value).reduce<Record<string, string>>((result, [cardInstanceId, text]) => {
    const trimmedId = cardInstanceId.trim();
    if (!trimmedId || typeof text !== 'string' || !text.trim()) return result;
    result[trimmedId] = text;
    return result;
  }, {});

  return Object.keys(notes).length > 0 ? notes : undefined;
}

function normalizeCounterGuideData(value: unknown): CounterGuideData | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.decks) || !Array.isArray(value.counterCards) || !Array.isArray(value.pairings)) return null;

  const decks = value.decks.flatMap((deck): CounterDeck[] => {
    if (!isRecord(deck) || typeof deck.name !== 'string') return [];
    const id = typeof deck.id === 'string' ? deck.id : sanitizeId(deck.name, 'deck');
    const tier = normalizeDeckTier(deck.tier) || 'Rogue';
    const endboard = Array.isArray(deck.endboard)
      ? deck.endboard.flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName] : [])
      : [];
    const endboardSlots = isRecord(deck.endboardSlots) ? deck.endboardSlots as PersistedEndboardSlots : undefined;
    const cardNotes = normalizeCardNotes(deck.cardNotes);
    const defaultDeck = COUNTER_DECKS.find((candidate) => candidate.id === id);
    const thumbnailCardName = typeof deck.thumbnailCardName === 'string' ? deck.thumbnailCardName : '';

    return [{
      id,
      name: deck.name,
      tier,
      thumbnailCardName: thumbnailCardName.trim() ? thumbnailCardName : defaultDeck?.thumbnailCardName,
      endboard,
      endboardSlots,
      cardNotes,
      plan: typeof deck.plan === 'string' ? deck.plan : '',
    }];
  });

  const counterCards = value.counterCards.flatMap((card): CounterCard[] => {
    if (!isRecord(card) || typeof card.name !== 'string') return [];
    const id = typeof card.id === 'string' ? card.id : sanitizeId(card.name, 'counter-card');
    const category = typeof card.category === 'string' && COUNTER_CARD_CATEGORIES.includes(card.category as CounterCardCategory)
      ? card.category as CounterCardCategory
      : 'Handtrap';
    const name = card.name.trim() ? card.name : id;

    return [{ id, name, category }];
  });

  const pairings = value.pairings.flatMap((pairing): CounterPairing[] => {
    if (!isRecord(pairing) || typeof pairing.deckId !== 'string') return [];
    const counterCardIds = [
      ...(Array.isArray(pairing.counterCardIds) ? pairing.counterCardIds : []),
      ...(typeof pairing.counterCardId === 'string' ? [pairing.counterCardId] : []),
    ].flatMap((id) => typeof id === 'string' && id.trim() ? [id.trim()] : []);
    const counteredCards = [
      ...(Array.isArray(pairing.counteredCards) ? pairing.counteredCards : []),
      ...(typeof pairing.counteredCard === 'string' ? [pairing.counteredCard] : []),
    ].flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName] : []);
    const seenCounteredCards = new Set<string>();
    const uniqueCounteredCards = counteredCards.flatMap((cardName) => {
      const key = cardName.trim().toLowerCase();
      if (seenCounteredCards.has(key)) return [];
      seenCounteredCards.add(key);
      return [cardName];
    });
    const primaryCounteredCard = uniqueCounteredCards[0] || '';

    return [{
      id: typeof pairing.id === 'string' ? pairing.id : sanitizeId(`${pairing.deckId}-${primaryCounteredCard || 'counter'}`, 'pairing'),
      deckId: pairing.deckId,
      counterCardIds: Array.from(new Set(counterCardIds)),
      counteredCard: primaryCounteredCard,
      counteredCards: uniqueCounteredCards,
      impact: typeof pairing.impact === 'string' && IMPACT_RATINGS.includes(pairing.impact as ImpactRating) ? pairing.impact as ImpactRating : 'Medium',
      summary: typeof pairing.summary === 'string' ? pairing.summary : '',
      timing: typeof pairing.timing === 'string' ? pairing.timing : '',
      tags: Array.isArray(pairing.tags)
        ? pairing.tags.flatMap((tag) => typeof tag === 'string' && tag.trim() ? [tag] : [])
        : [],
    }];
  });

  return { decks, counterCards, pairings };
}

export function getCounterGuideData(): CounterGuideData {
  const parsed = safeReadJson<unknown>(COUNTER_GUIDE_DATA_STORAGE_KEY, null);
  const normalized = normalizeCounterGuideData(parsed);
  if (normalized) return normalized;

  const tierOverrides = getTierOverrides();
  return {
    decks: getDecksWithTiers(tierOverrides, COUNTER_DECKS),
    counterCards: COUNTER_CARDS,
    pairings: COUNTER_PAIRINGS.map((pairing) => ({
      ...pairing,
      counterCardIds: getPairingCounterCardIds(pairing),
      counteredCards: getPairingCounteredCards(pairing),
    })),
  };
}

export function saveCounterGuideData(data: CounterGuideData): CounterGuideData {
  const normalized = normalizeCounterGuideData(data) || DEFAULT_COUNTER_GUIDE_DATA;
  window.localStorage.setItem(COUNTER_GUIDE_DATA_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getTierOverrides(): Record<string, DeckTier> {
  const parsed = safeReadJson<Record<string, DeckTier>>(COUNTER_TIER_OVERRIDES_STORAGE_KEY, {});
  return Object.fromEntries(
    Object.entries(parsed).flatMap(([deckId, tier]) => {
      const normalizedTier = normalizeDeckTier(tier);
      return normalizedTier ? [[deckId, normalizedTier]] : [];
    }),
  );
}

export function saveTierOverride(deckId: string, tier: DeckTier): Record<string, DeckTier> {
  const overrides = { ...getTierOverrides(), [deckId]: tier };
  window.localStorage.setItem(COUNTER_TIER_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  return overrides;
}

export function getCounterComments(): CounterComment[] {
  const comments = safeReadJson<CounterComment[]>(COUNTER_COMMENTS_STORAGE_KEY, []);
  if (!Array.isArray(comments)) return [];

  return comments.filter((comment) =>
    comment &&
    typeof comment.id === 'string' &&
    typeof comment.pairingId === 'string' &&
    typeof comment.text === 'string',
  );
}

export function saveCounterComments(comments: CounterComment[]): CounterComment[] {
  window.localStorage.setItem(COUNTER_COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  return comments;
}

export function getDecksWithTiers(overrides: Record<string, DeckTier>, decks: CounterDeck[] = COUNTER_DECKS): CounterDeck[] {
  return decks.map((deck) => ({
    ...deck,
    tier: overrides[deck.id] || deck.tier,
  }));
}

export function getCounterCardById(counterCardId: string, counterCards: CounterCard[] = COUNTER_CARDS): CounterCard | undefined {
  return counterCards.find((card) => card.id === counterCardId);
}

export function getDeckById(decks: CounterDeck[], deckId: string): CounterDeck | undefined {
  return decks.find((deck) => deck.id === deckId);
}

export function getPairingsForDeck(deckId: string, pairings: CounterPairing[] = COUNTER_PAIRINGS): CounterPairing[] {
  return pairings.filter((pairing) => pairing.deckId === deckId);
}

export function doesTextMatchQuery(values: string[], query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  return values.some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

export function calculateHandtrapStatistics(
  decks: CounterDeck[],
  counterCards: CounterCard[] = COUNTER_CARDS,
  allPairings: CounterPairing[] = COUNTER_PAIRINGS,
): HandtrapStatistic[] {
  return counterCards.filter((counterCard) => counterCard.category === 'Handtrap').map((counterCard) => {
    const pairings = allPairings.filter((pairing) => getPairingCounterCardIds(pairing).includes(counterCard.id));
    const deckIds = new Set(pairings.map((pairing) => pairing.deckId));
    const tierCounts = emptyTierCounts();
    let weightedScore = 0;
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    let lowImpactCount = 0;

    pairings.forEach((pairing) => {
      const deck = getDeckById(decks, pairing.deckId);
      if (!deck) return;

      weightedScore += TIER_WEIGHT[deck.tier] * IMPACT_WEIGHT[pairing.impact];
      if (pairing.impact === 'High') highImpactCount += 1;
      if (pairing.impact === 'Medium') mediumImpactCount += 1;
      if (pairing.impact === 'Low') lowImpactCount += 1;
    });

    deckIds.forEach((deckId) => {
      const deck = getDeckById(decks, deckId);
      if (deck) tierCounts[deck.tier] += 1;
    });

    const upperTierHits = tierCounts['Tier 1'] + tierCounts['Tier 2'] + tierCounts['Tier 3'];
    const summary = weightedScore >= 28
      ? 'Very strong vs Tier 1-3'
      : upperTierHits >= 3
        ? 'Good vs upper tiers'
        : tierCounts.Rogue + tierCounts['Low Tier'] > upperTierHits
          ? 'Mostly format-dependent'
          : 'Niche but useful';

    return {
      counterCard,
      totalDecks: deckIds.size,
      totalPairings: pairings.length,
      highImpactCount,
      mediumImpactCount,
      lowImpactCount,
      tierCounts,
      weightedScore,
      summary,
    };
  }).sort((a, b) => b.weightedScore - a.weightedScore || b.totalDecks - a.totalDecks || a.counterCard.name.localeCompare(b.counterCard.name));
}
