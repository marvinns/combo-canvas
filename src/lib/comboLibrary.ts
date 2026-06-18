export interface SavedCombo {
  id: string;
  deck?: string;
  subsectionId?: string;
  assignedDeck?: DeckAssignment;
  endboardSlots?: ComboEndboardSlots;
  stepComments?: ComboStepComments;
  comboLinks?: ComboStepLinks;
  thumbnailCardName?: string;
  name: string;
  text: string;
  createdAt: number;
}

export type ComboEndboardSlotCards = string | string[];
export type ComboEndboardSlots = Partial<Record<string, ComboEndboardSlotCards>>;

export interface ComboStepComment {
  text: string;
  x: number;
  y: number;
  width: number;
}

export type ComboStepComments = Partial<Record<string, ComboStepComment>>;

export interface ComboStepLink {
  id: string;
  label: string;
  targetComboId: string | null;
  targetStepIndex: number;
  x: number;
  y: number;
  width: number;
}

export type ComboStepLinks = Partial<Record<string, ComboStepLink[]>>;

export type DeckSection = 'main' | 'extra' | 'side';

export interface DeckCard {
  name: string;
  count: number;
}

export interface DeckAssignment {
  name: string;
  source?: 'auto' | 'manual';
  main: DeckCard[];
  extra: DeckCard[];
  side: DeckCard[];
}

export interface DeckAssignmentInput {
  name: string;
  mainText: string;
  extraText: string;
  sideText: string;
}

export interface DeckSubsection {
  id: string;
  name: string;
  parentId?: string;
}

export interface CreateDeckAssignmentOptions {
  preferExtraDeck?: boolean;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ComboDeckDraftText {
  mainText: string;
  extraText: string;
}

export interface ComboDeckDraftLookupCard {
  name: string;
  type?: string;
}

export interface ComboDeckDraftOptions {
  lookupCard?: (name: string) => Promise<ComboDeckDraftLookupCard | null>;
}

const STORAGE_KEY = 'ygo-combo-library';
const SUBSECTIONS_STORAGE_KEY = 'ygo-combo-library-subsections';
const LEGACY_DECK_LABEL = 'General';
const FUZZY_BLOCKLIST = new Set([
  'a',
  'an',
  'the',
  'card',
  'target',
  'effect',
  'it',
  'itself',
  'unknown',
]);
const CARD_NAME_ALIASES: Record<string, string> = {
  'the hallowed azamina': 'The Hallowed Azamina',
  'sinful spoils of the white forest': 'Sinful Spoils of the White Forest',
  'azamina ilia': 'Azamina Ilia',
};

function normalizeCardName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function resolveCardLookupName(name: string): string {
  return CARD_NAME_ALIASES[normalizeCardName(name)] || name;
}

function shouldAttemptFuzzyCardMatch(name: string): boolean {
  const normalized = normalizeCardName(name);
  if (!normalized) return false;
  if (FUZZY_BLOCKLIST.has(normalized)) return false;
  if (/^card\b/.test(normalized)) return false;

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length >= 2) return true;

  return normalized.length >= 4;
}

function isAcceptableFuzzyCardMatch(requestedName: string, matchedName: string): boolean {
  const requested = normalizeCardName(requestedName);
  const matched = normalizeCardName(matchedName);

  if (!requested || !matched) return false;
  if (requested === matched) return true;
  if (!shouldAttemptFuzzyCardMatch(requestedName)) return false;

  const requestedTokens = requested.split(' ').filter(Boolean);
  const matchedTokens = matched.split(' ').filter(Boolean);

  return requestedTokens.every((requestedToken) =>
    matchedTokens.some((matchedToken) =>
      matchedToken === requestedToken ||
      matchedToken.startsWith(requestedToken) ||
      requestedToken.startsWith(matchedToken),
    ),
  );
}

function parseDeckLine(line: string): DeckCard | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const countMatch = trimmed.match(/^(?:(\d+)\s*x?\s+|x\s*(\d+)\s+)(.+)$/i);
  const rawCount = countMatch?.[1] || countMatch?.[2];
  const count = rawCount ? Number(rawCount) : 1;
  const rawName = countMatch ? countMatch[3] : trimmed;
  const bracketMatch = rawName.match(/^\[(.+)\]$/);
  const name = (bracketMatch ? bracketMatch[1] : rawName).trim();

  if (!name || !Number.isFinite(count) || count < 1) return null;
  return { name, count };
}

function mergeDeckCards(cards: DeckCard[]): DeckCard[] {
  const byName = new Map<string, DeckCard>();

  for (const card of cards) {
    const key = normalizeCardName(card.name);
    const existing = byName.get(key);
    if (existing) {
      existing.count += card.count;
    } else {
      byName.set(key, { ...card });
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function mergeDeckCardsPreservingMaxCount(cards: DeckCard[]): DeckCard[] {
  const byName = new Map<string, DeckCard>();

  for (const card of cards) {
    const key = normalizeCardName(card.name);
    const existing = byName.get(key);
    if (existing) {
      existing.count = Math.max(existing.count, card.count);
    } else {
      byName.set(key, { ...card });
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function mergeExtraDeckGeneratedDefaults(draftCards: DeckCard[], baseCards: DeckCard[]): DeckCard[] {
  const generatedDefaults = new Set(draftCards.map((card) => normalizeCardName(card.name)));
  const normalizedBaseCards = baseCards.map((card) =>
    generatedDefaults.has(normalizeCardName(card.name))
      ? { ...card, count: 1 }
      : card,
  );

  return mergeDeckCardsPreservingMaxCount([...draftCards, ...normalizedBaseCards]);
}

export function parseDeckSection(text: string): DeckCard[] {
  return mergeDeckCards(text.split('\n').map(parseDeckLine).filter((card): card is DeckCard => Boolean(card)));
}

function formatDeckCardsAsText(cards: DeckCard[]): string {
  return cards.map((card) => `${card.count} ${card.name}`).join('\n');
}

function formatDeckSection(cards: DeckCard[]): string {
  return cards.map((card) => `${card.count} ${card.name}`).join('\n');
}

function getUniqueComboCardNames(text: string): string[] {
  const cardsByName = new Map<string, string>();

  for (const match of text.matchAll(/\[(.+?)\]/g)) {
    const name = match[1].trim();
    if (!name) continue;
    const normalizedName = normalizeCardName(name);
    if (!cardsByName.has(normalizedName)) {
      cardsByName.set(normalizedName, name);
    }
  }

  return Array.from(cardsByName.values()).sort((a, b) => a.localeCompare(b));
}

function isExtraDeckMonsterType(type?: string): boolean {
  return /\b(?:fusion|synchro|xyz|link)\b/i.test(type || '');
}

async function fetchYgoCard(name: string): Promise<ComboDeckDraftLookupCard | null> {
  if (!name || name === 'Unknown') return null;
  const lookupName = resolveCardLookupName(name);

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(lookupName)}`);
    if (!res.ok) {
      if (!shouldAttemptFuzzyCardMatch(lookupName)) return null;

      const fuzzy = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(lookupName)}`);
      if (!fuzzy.ok) return null;
      const fuzzyData = await fuzzy.json();
      const fuzzyCard = fuzzyData?.data?.[0];
      if (!fuzzyCard?.name || !isAcceptableFuzzyCardMatch(name, fuzzyCard.name)) return null;
      return { name: fuzzyCard.name, type: fuzzyCard.type };
    }

    const data = await res.json();
    const card = data?.data?.[0];
    if (!card?.name) return null;
    return { name: card.name, type: card.type };
  } catch {
    return null;
  }
}

export async function getComboDeckDraftText(text: string, options: ComboDeckDraftOptions = {}): Promise<ComboDeckDraftText> {
  const lookupCard = options.lookupCard || fetchYgoCard;
  const cards = await Promise.all(getUniqueComboCardNames(text).map(async (name) => {
    const card = await lookupCard(name);
    return {
      name: card?.name || name,
      count: 1,
      section: isExtraDeckMonsterType(card?.type) ? 'extra' as const : 'main' as const,
    };
  }));
  const mainCards = cards.filter((card) => card.section === 'main');
  const extraCards = cards.filter((card) => card.section === 'extra');

  return {
    mainText: formatDeckCardsAsText(mergeDeckCards(mainCards).map((card) => ({ ...card, count: 1 }))),
    extraText: formatDeckCardsAsText(mergeDeckCards(extraCards).map((card) => ({ ...card, count: 1 }))),
  };
}

export async function maintainExtraDeckFilter(deck: DeckAssignment, options: ComboDeckDraftOptions = {}): Promise<DeckAssignment> {
  const lookupCard = options.lookupCard || fetchYgoCard;
  const mainCards: DeckCard[] = [];
  const extraCards: DeckCard[] = [];

  await Promise.all(([
    ...deck.main.map((card) => ({ ...card, section: 'main' as const })),
    ...deck.extra.map((card) => ({ ...card, section: 'extra' as const })),
  ]).map(async (card) => {
    const lookup = await lookupCard(card.name);
    const resolvedCard = { name: lookup?.name || card.name, count: card.count };

    if (!lookup) {
      (card.section === 'extra' ? extraCards : mainCards).push(resolvedCard);
      return;
    }

    (isExtraDeckMonsterType(lookup.type) ? extraCards : mainCards).push(resolvedCard);
  }));

  return capDeckCopies({
    ...deck,
    main: mergeDeckCards(mainCards),
    extra: mergeDeckCards(extraCards),
    side: mergeDeckCards(deck.side),
  });
}

function capDeckCopies(deck: DeckAssignment): DeckAssignment {
  const seenCopies = new Map<string, number>();

  const capSection = (cards: DeckCard[]) => cards.flatMap((card) => {
    const key = normalizeCardName(card.name);
    const seen = seenCopies.get(key) || 0;
    const count = Math.min(card.count, Math.max(0, 3 - seen));

    if (count < 1) return [];
    seenCopies.set(key, seen + count);
    return [{ ...card, count }];
  });

  return {
    ...deck,
    main: capSection(deck.main),
    extra: capSection(deck.extra),
    side: capSection(deck.side),
  };
}

export async function createCombinedDeckAssignmentFromTexts(
  name: string,
  comboTexts: string[],
  baseDeck?: DeckAssignment,
  options: ComboDeckDraftOptions = {},
): Promise<DeckAssignment> {
  const draft = await getComboDeckDraftText(comboTexts.join('\n'), options);
  const draftDeck = createDeckAssignment({
    name,
    mainText: draft.mainText,
    extraText: draft.extraText,
    sideText: '',
  }, { preferExtraDeck: true });
  const deck: DeckAssignment = {
    name: name.trim(),
    source: 'auto',
    main: mergeDeckCardsPreservingMaxCount([...draftDeck.main, ...(baseDeck?.main || [])]),
    extra: mergeExtraDeckGeneratedDefaults(draftDeck.extra, baseDeck?.extra || []),
    side: mergeDeckCardsPreservingMaxCount(baseDeck?.side || []),
  };

  return maintainExtraDeckFilter(deck, options);
}

function normalizeDeckCards(value: unknown): DeckCard[] {
  if (!Array.isArray(value)) return [];

  return mergeDeckCards(value.flatMap((card) => {
    if (!card || typeof card !== 'object') return [];
    const maybeCard = card as Partial<DeckCard>;
    const name = typeof maybeCard.name === 'string' ? maybeCard.name.trim() : '';
    const count = Number(maybeCard.count);
    if (!name || !Number.isFinite(count) || count < 1) return [];
    return [{ name, count }];
  }));
}

function normalizeDeckAssignment(value: unknown): DeckAssignment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const deck = value as Partial<DeckAssignment>;
  const name = typeof deck.name === 'string' ? deck.name.trim() : '';
  if (!name) return undefined;
  const source = deck.source === 'manual' ? 'manual' : deck.source === 'auto' ? 'auto' : undefined;

  return {
    name,
    source,
    main: normalizeDeckCards(deck.main),
    extra: normalizeDeckCards(deck.extra),
    side: normalizeDeckCards(deck.side),
  };
}

export function createDeckAssignment(input: DeckAssignmentInput, options: CreateDeckAssignmentOptions = {}): DeckAssignment {
  const extra = parseDeckSection(input.extraText);
  const extraCardNames = new Set(extra.map((card) => normalizeCardName(card.name)));
  const main = parseDeckSection(input.mainText)
    .filter((card) => !options.preferExtraDeck || !extraCardNames.has(normalizeCardName(card.name)));

  return {
    name: input.name.trim(),
    main,
    extra,
    side: parseDeckSection(input.sideText),
  };
}

function getSectionTotal(cards: DeckCard[]): number {
  return cards.reduce((total, card) => total + card.count, 0);
}

function getMainExtraConflicts(deck: DeckAssignment): string[] {
  const mainCardsByName = new Map(deck.main.map((card) => [normalizeCardName(card.name), card.name]));

  return deck.extra
    .filter((card) => mainCardsByName.has(normalizeCardName(card.name)))
    .map((card) => mainCardsByName.get(normalizeCardName(card.name)) || card.name)
    .sort((a, b) => a.localeCompare(b));
}

function addDeckValidationRules(deck: DeckAssignment, errors: string[]): void {
  for (const name of getMainExtraConflicts(deck)) {
    errors.push(`${name} cannot be in both the Main Deck and Extra Deck.`);
  }

  const totalCopies = new Map<string, { name: string; count: number }>();
  for (const card of [...deck.main, ...deck.extra, ...deck.side]) {
    const key = normalizeCardName(card.name);
    const existing = totalCopies.get(key);
    if (existing) {
      existing.count += card.count;
    } else {
      totalCopies.set(key, { name: card.name, count: card.count });
    }
  }

  for (const { name, count } of totalCopies.values()) {
    if (count > 3) errors.push(`${name} appears ${count} times. A card can appear no more than 3 times in the assigned deck.`);
  }
}

export function validateDeckAssignment(deck: DeckAssignment): DeckValidationResult {
  const errors: string[] = [];
  const mainTotal = getSectionTotal(deck.main);
  const extraTotal = getSectionTotal(deck.extra);
  const sideTotal = getSectionTotal(deck.side);

  if (!deck.name.trim()) errors.push('Deck name is required when assigning a deck.');
  if (mainTotal < 40 || mainTotal > 60) errors.push('Main Deck must contain 40 to 60 cards.');
  if (extraTotal < 1 || extraTotal > 15) errors.push('Extra Deck must contain 1 to 15 cards.');
  if (sideTotal > 15) errors.push('Side Deck can contain up to 15 cards.');

  addDeckValidationRules(deck, errors);

  return { isValid: errors.length === 0, errors };
}

export function getDeckBlockingErrors(deck: DeckAssignment): string[] {
  const errors: string[] = [];

  if (!deck.name.trim()) errors.push('Deck name is required when assigning a deck.');

  return errors;
}

export function getDeckCards(deck?: DeckAssignment): Array<DeckCard & { section: DeckSection }> {
  if (!deck) return [];
  return [
    ...deck.main.map((card) => ({ ...card, section: 'main' as const })),
    ...deck.extra.map((card) => ({ ...card, section: 'extra' as const })),
    ...deck.side.map((card) => ({ ...card, section: 'side' as const })),
  ];
}

function normalizeSavedCombo(combo: Partial<SavedCombo>): SavedCombo | null {
  if (!combo.id || !combo.name || !combo.text || !combo.createdAt) return null;
  const assignedDeck = normalizeDeckAssignment(combo.assignedDeck);
  const legacyDeck = combo.deck?.trim();
  const endboardSlots = normalizeEndboardSlots(combo.endboardSlots);
  const stepComments = normalizeStepComments(combo.stepComments);
  const comboLinks = normalizeComboLinks(combo.comboLinks);
  const thumbnailCardName = typeof combo.thumbnailCardName === 'string' ? combo.thumbnailCardName.trim() : '';
  const subsectionId = typeof combo.subsectionId === 'string' ? combo.subsectionId.trim() : '';

  return {
    id: combo.id,
    deck: assignedDeck?.name || legacyDeck || undefined,
    subsectionId: subsectionId || undefined,
    assignedDeck,
    endboardSlots,
    stepComments,
    comboLinks,
    thumbnailCardName: thumbnailCardName || undefined,
    name: combo.name,
    text: combo.text,
    createdAt: combo.createdAt,
  };
}

function normalizeEndboardSlots(slots?: ComboEndboardSlots): ComboEndboardSlots | undefined {
  if (!slots || typeof slots !== 'object') return undefined;

  const normalized = Object.entries(slots).reduce<ComboEndboardSlots>((result, [slotId, slotCards]) => {
    if (!slotId) return result;
    const cards = (Array.isArray(slotCards) ? slotCards : [slotCards])
      .flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName.trim()] : []);
    if (cards.length === 0) return result;

    result[slotId] = cards.length === 1 ? cards[0] : cards;
    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeStepComments(comments?: ComboStepComments): ComboStepComments | undefined {
  if (!comments || typeof comments !== 'object') return undefined;

  const normalized = Object.entries(comments).reduce<ComboStepComments>((result, [stepIndex, comment]) => {
    if (!comment || typeof comment !== 'object') return result;

    const text = typeof comment.text === 'string' ? comment.text : '';
    const x = Number(comment.x);
    const y = Number(comment.y);
    const width = Number(comment.width);
    if (!Number.isInteger(Number(stepIndex)) || Number(stepIndex) < 0) return result;
    if (!text.trim() && !Number.isFinite(x) && !Number.isFinite(y) && !Number.isFinite(width)) return result;

    result[stepIndex] = {
      text,
      x: Number.isFinite(x) ? x : 20,
      y: Number.isFinite(y) ? y : 18,
      width: Number.isFinite(width) ? Math.max(180, Math.min(width, 520)) : 260,
    };
    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeComboLinks(links?: ComboStepLinks): ComboStepLinks | undefined {
  if (!links || typeof links !== 'object') return undefined;

  const normalized = Object.entries(links).reduce<ComboStepLinks>((result, [stepIndex, stepLinks]) => {
    if (!Number.isInteger(Number(stepIndex)) || Number(stepIndex) < 0 || !Array.isArray(stepLinks)) return result;

    const normalizedStepLinks = stepLinks.flatMap((link) => {
      if (!link || typeof link !== 'object') return [];

      const id = typeof link.id === 'string' && link.id.trim() ? link.id : crypto.randomUUID();
      const label = typeof link.label === 'string' ? link.label : 'Combo Link';
      const targetComboId = typeof link.targetComboId === 'string' && link.targetComboId.trim()
        ? link.targetComboId
        : null;
      const targetStepIndex = Number(link.targetStepIndex);
      const x = Number(link.x);
      const y = Number(link.y);
      const width = Number(link.width);

      if (!Number.isInteger(targetStepIndex) || targetStepIndex < 0) return [];

      return [{
        id,
        label: label.trim() || 'Combo Link',
        targetComboId,
        targetStepIndex,
        x: Number.isFinite(x) ? x : 76,
        y: Number.isFinite(y) ? y : 18,
        width: Number.isFinite(width) ? Math.max(150, Math.min(width, 420)) : 220,
      }];
    });

    if (normalizedStepLinks.length > 0) {
      result[stepIndex] = normalizedStepLinks;
    }

    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function getSavedCombos(): SavedCombo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((combo) => normalizeSavedCombo(combo))
      .filter((combo): combo is SavedCombo => Boolean(combo));
  } catch {
    return [];
  }
}

function getSavedDeckSubsections(): Record<string, DeckSubsection[]> {
  try {
    const raw = localStorage.getItem(SUBSECTIONS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, DeckSubsection[]>>((result, [deckName, subsections]) => {
      if (!deckName.trim() || !Array.isArray(subsections)) return result;

      const normalized = subsections.flatMap((subsection) => {
        if (!subsection || typeof subsection !== 'object') return [];
        const maybeSubsection = subsection as Partial<DeckSubsection>;
        const id = typeof maybeSubsection.id === 'string' ? maybeSubsection.id.trim() : '';
        const name = typeof maybeSubsection.name === 'string' ? maybeSubsection.name.trim() : '';
        const parentId = typeof maybeSubsection.parentId === 'string' ? maybeSubsection.parentId.trim() : '';
        return id && name ? [{ id, name, ...(parentId ? { parentId } : {}) }] : [];
      });

      const subsectionIds = new Set(normalized.map((subsection) => subsection.id));
      const normalizedWithValidParents = normalized.map((subsection) =>
        subsection.parentId && subsectionIds.has(subsection.parentId) && subsection.parentId !== subsection.id
          ? subsection
          : { id: subsection.id, name: subsection.name },
      );

      if (normalizedWithValidParents.length > 0) result[deckName] = normalizedWithValidParents;
      return result;
    }, {});
  } catch {
    return {};
  }
}

function saveDeckSubsections(subsections: Record<string, DeckSubsection[]>): void {
  localStorage.setItem(SUBSECTIONS_STORAGE_KEY, JSON.stringify(subsections));
}

export function getDeckSubsections(deckName: string): DeckSubsection[] {
  return getSavedDeckSubsections()[deckName]?.map((subsection) => ({ ...subsection })) || [];
}

export function createDeckSubsection(deckName: string, name: string, parentId?: string): DeckSubsection | null {
  const trimmedDeckName = deckName.trim();
  const trimmedName = name.trim();
  if (!trimmedDeckName || !trimmedName) return null;

  const allSubsections = getSavedDeckSubsections();
  const deckSubsections = allSubsections[trimmedDeckName] || [];
  const trimmedParentId = parentId?.trim();
  const parentSubsection = trimmedParentId
    ? deckSubsections.find((subsection) => subsection.id === trimmedParentId)
    : undefined;
  if (trimmedParentId && !parentSubsection) return null;
  if (deckSubsections.some((subsection) =>
    (subsection.parentId || '') === (trimmedParentId || '') &&
    subsection.name.toLowerCase() === trimmedName.toLowerCase()
  )) return null;

  const subsection = { id: crypto.randomUUID(), name: trimmedName, ...(trimmedParentId ? { parentId: trimmedParentId } : {}) };
  allSubsections[trimmedDeckName] = [...deckSubsections, subsection];
  saveDeckSubsections(allSubsections);
  return subsection;
}

export function renameDeckSubsection(deckName: string, subsectionId: string, name: string): DeckSubsection | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const allSubsections = getSavedDeckSubsections();
  const deckSubsections = allSubsections[deckName] || [];
  const existingSubsection = deckSubsections.find((candidate) => candidate.id === subsectionId);
  if (!existingSubsection) return null;
  if (deckSubsections.some((subsection) =>
    subsection.id !== subsectionId &&
    (subsection.parentId || '') === (existingSubsection.parentId || '') &&
    subsection.name.toLowerCase() === trimmedName.toLowerCase()
  )) {
    return null;
  }

  const renamedSubsection = { ...existingSubsection, name: trimmedName };
  allSubsections[deckName] = deckSubsections.map((candidate) =>
    candidate.id === subsectionId ? renamedSubsection : candidate,
  );
  saveDeckSubsections(allSubsections);
  return renamedSubsection;
}

export function deleteDeckSubsection(deckName: string, subsectionId: string): SavedCombo[] {
  const allSubsections = getSavedDeckSubsections();
  const deckSubsections = allSubsections[deckName] || [];
  const deletedSubsectionIds = new Set<string>([subsectionId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const subsection of deckSubsections) {
      if (subsection.parentId && deletedSubsectionIds.has(subsection.parentId) && !deletedSubsectionIds.has(subsection.id)) {
        deletedSubsectionIds.add(subsection.id);
        changed = true;
      }
    }
  }

  allSubsections[deckName] = deckSubsections.filter((subsection) => !deletedSubsectionIds.has(subsection.id));
  if (allSubsections[deckName].length === 0) delete allSubsections[deckName];
  saveDeckSubsections(allSubsections);

  const combos = getSavedCombos().map((combo) =>
    combo.subsectionId && deletedSubsectionIds.has(combo.subsectionId) && (combo.assignedDeck?.name || combo.deck) === deckName
      ? { ...combo, subsectionId: undefined }
      : combo,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return combos;
}

export function saveCombo(
  deck: string | undefined,
  name: string,
  text: string,
  assignedDeck?: DeckAssignment,
  endboardSlots?: ComboEndboardSlots,
  stepComments?: ComboStepComments,
  comboLinks?: ComboStepLinks,
): SavedCombo {
  const combos = getSavedCombos();
  const trimmedDeck = assignedDeck?.name || deck?.trim() || undefined;
  const combo: SavedCombo = {
    id: crypto.randomUUID(),
    deck: trimmedDeck,
    assignedDeck,
    endboardSlots: normalizeEndboardSlots(endboardSlots),
    stepComments: normalizeStepComments(stepComments),
    comboLinks: normalizeComboLinks(comboLinks),
    name,
    text,
    createdAt: Date.now(),
  };
  combos.unshift(combo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return combo;
}

export function updateCombo(id: string, updates: Partial<Pick<SavedCombo, 'deck' | 'name' | 'text' | 'endboardSlots' | 'stepComments' | 'comboLinks' | 'thumbnailCardName'>> & { assignedDeck?: DeckAssignment | null; subsectionId?: string | null }): SavedCombo | null {
  const combos = getSavedCombos();
  const comboIndex = combos.findIndex((combo) => combo.id === id);
  if (comboIndex === -1) return null;

  const existingCombo = combos[comboIndex];
  const assignedDeck = updates.assignedDeck !== undefined ? updates.assignedDeck || undefined : existingCombo.assignedDeck;
  const endboardSlots = updates.endboardSlots !== undefined ? normalizeEndboardSlots(updates.endboardSlots) : existingCombo.endboardSlots;
  const stepComments = updates.stepComments !== undefined ? normalizeStepComments(updates.stepComments) : existingCombo.stepComments;
  const comboLinks = updates.comboLinks !== undefined ? normalizeComboLinks(updates.comboLinks) : existingCombo.comboLinks;
  const thumbnailCardName = updates.thumbnailCardName !== undefined ? updates.thumbnailCardName.trim() || undefined : existingCombo.thumbnailCardName;
  const subsectionId = updates.subsectionId !== undefined ? updates.subsectionId?.trim() || undefined : existingCombo.subsectionId;
  const updatedCombo: SavedCombo = {
    ...existingCombo,
    deck: assignedDeck?.name || (updates.deck !== undefined ? updates.deck.trim() || undefined : existingCombo.deck),
    assignedDeck,
    subsectionId,
    endboardSlots,
    stepComments,
    comboLinks,
    thumbnailCardName,
    name: updates.name !== undefined ? updates.name : existingCombo.name,
    text: updates.text !== undefined ? updates.text : existingCombo.text,
  };

  combos[comboIndex] = updatedCombo;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return updatedCombo;
}

function getSavedComboDeckName(combo: SavedCombo): string {
  return combo.assignedDeck?.name || combo.deck || 'Unassigned';
}

export function moveComboInLibrary(
  comboId: string,
  target: {
    deckName: string;
    subsectionId?: string | null;
    beforeComboId?: string;
    afterComboId?: string;
  },
): SavedCombo[] {
  const combos = getSavedCombos();
  const movingCombo = combos.find((combo) => combo.id === comboId);
  if (!movingCombo) return combos;
  if (getSavedComboDeckName(movingCombo) !== target.deckName) return combos;
  if (target.beforeComboId === comboId || target.afterComboId === comboId) return combos;

  const nextSubsectionId = target.subsectionId?.trim() || undefined;
  const movedCombo: SavedCombo = { ...movingCombo, subsectionId: nextSubsectionId };
  const remainingCombos = combos.filter((combo) => combo.id !== comboId);
  let insertIndex = -1;

  if (target.beforeComboId) {
    insertIndex = remainingCombos.findIndex((combo) => combo.id === target.beforeComboId);
  } else if (target.afterComboId) {
    const afterIndex = remainingCombos.findIndex((combo) => combo.id === target.afterComboId);
    insertIndex = afterIndex === -1 ? -1 : afterIndex + 1;
  } else {
    for (let index = remainingCombos.length - 1; index >= 0; index -= 1) {
      const combo = remainingCombos[index];
      if (getSavedComboDeckName(combo) === target.deckName && (combo.subsectionId || '') === (nextSubsectionId || '')) {
        insertIndex = index + 1;
        break;
      }
    }
  }

  const nextCombos = [...remainingCombos];
  nextCombos.splice(insertIndex === -1 ? nextCombos.length : insertIndex, 0, movedCombo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCombos));
  return nextCombos;
}

export function renameDeck(oldDeck: string, newDeck: string): SavedCombo[] {
  const trimmedNewDeck = newDeck.trim() || LEGACY_DECK_LABEL;
  const combos = getSavedCombos().map((combo) =>
    combo.deck === oldDeck
      ? {
          ...combo,
          deck: trimmedNewDeck,
          assignedDeck: combo.assignedDeck ? { ...combo.assignedDeck, name: trimmedNewDeck } : combo.assignedDeck,
        }
      : combo,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  const allSubsections = getSavedDeckSubsections();
  if (allSubsections[oldDeck]) {
    allSubsections[trimmedNewDeck] = [
      ...(allSubsections[trimmedNewDeck] || []),
      ...allSubsections[oldDeck],
    ];
    delete allSubsections[oldDeck];
    saveDeckSubsections(allSubsections);
  }
  return combos;
}

export function duplicateCombo(id: string): SavedCombo | null {
  const combos = getSavedCombos();
  const sourceCombo = combos.find((combo) => combo.id === id);
  if (!sourceCombo) return null;

  const duplicatedCombo: SavedCombo = {
    ...sourceCombo,
    id: crypto.randomUUID(),
    name: `${sourceCombo.name} Copy`,
    createdAt: Date.now(),
  };

  combos.unshift(duplicatedCombo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return duplicatedCombo;
}

export function deleteCombo(id: string) {
  const combos = getSavedCombos().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
}
