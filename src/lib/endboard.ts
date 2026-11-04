export type EndboardSlotId =
  | 'top-left'
  | 'top-right'
  | 'field-left'
  | 'field-right'
  | 'extra-left'
  | 'monster-1'
  | 'monster-2'
  | 'monster-3'
  | 'monster-4'
  | 'monster-5'
  | 'extra-right'
  | 'spell-left'
  | 'spell-1'
  | 'spell-2'
  | 'spell-3'
  | 'spell-4'
  | 'spell-5'
  | 'spell-right'
  | 'hand-1'
  | 'hand-2'
  | 'hand-3'
  | 'hand-4'
  | 'hand-5'
  | 'hand-6';

export type EndboardSlotCards = string[];
export type EndboardSlots = Partial<Record<EndboardSlotId, EndboardSlotCards>>;
export type PersistedEndboardSlots = Partial<Record<string, string | string[]>>;

export type EndboardSlotConfig = {
  id: EndboardSlotId;
  row: 1 | 2 | 3;
  col: number;
  variant?: 'extra' | 'spell' | 'field' | 'hand';
};

export type YgoSearchCard = {
  name: string;
};

export const ENDBOARD_SLOTS: EndboardSlotConfig[] = [
  { id: 'top-left', row: 1, col: 3, variant: 'field' },
  { id: 'top-right', row: 1, col: 5, variant: 'field' },
  { id: 'extra-left', row: 2, col: 1, variant: 'extra' },
  { id: 'monster-1', row: 2, col: 2 },
  { id: 'monster-2', row: 2, col: 3 },
  { id: 'monster-3', row: 2, col: 4 },
  { id: 'monster-4', row: 2, col: 5 },
  { id: 'monster-5', row: 2, col: 6 },
  { id: 'extra-right', row: 2, col: 7, variant: 'extra' },
  { id: 'spell-left', row: 3, col: 1, variant: 'spell' },
  { id: 'spell-1', row: 3, col: 2, variant: 'spell' },
  { id: 'spell-2', row: 3, col: 3, variant: 'spell' },
  { id: 'spell-3', row: 3, col: 4, variant: 'spell' },
  { id: 'spell-4', row: 3, col: 5, variant: 'spell' },
  { id: 'spell-5', row: 3, col: 6, variant: 'spell' },
  { id: 'spell-right', row: 3, col: 7, variant: 'spell' },
];

export const ENDBOARD_HAND_SLOTS: EndboardSlotConfig[] = [
  { id: 'hand-1', row: 1, col: 1, variant: 'hand' },
  { id: 'hand-2', row: 1, col: 2, variant: 'hand' },
  { id: 'hand-3', row: 1, col: 3, variant: 'hand' },
  { id: 'hand-4', row: 1, col: 4, variant: 'hand' },
  { id: 'hand-5', row: 1, col: 5, variant: 'hand' },
  { id: 'hand-6', row: 1, col: 6, variant: 'hand' },
];

export const ENDBOARD_SLOT_IDS = new Set([...ENDBOARD_SLOTS, ...ENDBOARD_HAND_SLOTS].map((slot) => slot.id));


export function normalizeEndboardSlotCards(value: string | string[] | undefined): EndboardSlotCards {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName.trim()] : []);
}

export function serializeEndboardSlotCards(cards: EndboardSlotCards): string | string[] | undefined {
  if (cards.length === 0) return undefined;
  return cards.length === 1 ? cards[0] : cards;
}

export async function searchYgoCards(query: string): Promise<YgoSearchCard[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(trimmedQuery)}`);
    if (!res.ok) return [];

    const data = await res.json();
    const cards = Array.isArray(data?.data) ? data.data as YgoSearchCard[] : [];
    const seen = new Set<string>();

    return cards.flatMap((card) => {
      const name = typeof card?.name === 'string' ? card.name.trim() : '';
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{ name }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}

