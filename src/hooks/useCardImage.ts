import { useQuery } from '@tanstack/react-query';

interface YGOCard {
  id: number;
  name: string;
  archetype?: string;
  card_images: { id: number; image_url: string; image_url_small: string; image_url_cropped: string }[];
}

const CARD_QUERY_CACHE_VERSION = 'v4';
const RELATED_CARD_QUERY_CACHE_VERSION = 'v1';
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
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function resolveCardLookupName(name: string): string {
  const normalized = normalizeCardName(name);
  return CARD_NAME_ALIASES[normalized] || name;
}

export function shouldAttemptFuzzyCardMatch(name: string): boolean {
  const normalized = normalizeCardName(name);
  if (!normalized) return false;
  if (FUZZY_BLOCKLIST.has(normalized)) return false;
  if (/^card\b/.test(normalized)) return false;

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length >= 2) return true;

  return normalized.length >= 4;
}

export function isAcceptableFuzzyCardMatch(requestedName: string, matchedName: string): boolean {
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

async function fetchCard(name: string): Promise<{ imageUrl: string; croppedImageUrl?: string; name: string; archetype?: string } | null> {
  if (!name || name === 'Unknown') return null;
  const lookupName = resolveCardLookupName(name);

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(lookupName)}`);
    if (!res.ok) {
      if (!shouldAttemptFuzzyCardMatch(lookupName)) return null;

      // Try fuzzy search
      const fuzzy = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(lookupName)}`);
      if (!fuzzy.ok) return null;
      const data = await fuzzy.json();
      const card: YGOCard = data.data[0];
      if (!card || !isAcceptableFuzzyCardMatch(name, card.name)) return null;
      return {
        imageUrl: card.card_images[0].image_url,
        croppedImageUrl: card.card_images[0].image_url_cropped,
        name: card.name,
        archetype: card.archetype,
      };
    }
    const data = await res.json();
    const card: YGOCard = data.data[0];
    return {
      imageUrl: card.card_images[0].image_url,
      croppedImageUrl: card.card_images[0].image_url_cropped,
      name: card.name,
      archetype: card.archetype,
    };
  } catch {
    return null;
  }
}

async function fetchRelatedCards(cardName: string): Promise<{ archetype?: string; cards: Array<{ id: number; name: string; imageUrl: string; thumbnailUrl: string }> }> {
  const card = await fetchCard(cardName);
  if (!card?.archetype) return { archetype: card?.archetype, cards: [] };

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=${encodeURIComponent(card.archetype)}`);
    if (!res.ok) return { archetype: card.archetype, cards: [] };

    const data = await res.json();
    const cards = Array.isArray(data?.data) ? data.data as YGOCard[] : [];
    const currentCardName = normalizeCardName(card.name);
    const seen = new Set<string>();

    return {
      archetype: card.archetype,
      cards: cards
        .flatMap((relatedCard) => {
          const normalizedName = normalizeCardName(relatedCard.name);
          const image = relatedCard.card_images?.[0];
          if (!normalizedName || normalizedName === currentCardName || seen.has(normalizedName) || !image) return [];
          seen.add(normalizedName);
          return [{
            id: relatedCard.id,
            name: relatedCard.name,
            imageUrl: image.image_url,
            thumbnailUrl: image.image_url_small || image.image_url_cropped || image.image_url,
          }];
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch {
    return { archetype: card.archetype, cards: [] };
  }
}

export function useCardImage(cardName: string) {
  return useQuery({
    queryKey: ['ygo-card', CARD_QUERY_CACHE_VERSION, cardName],
    queryFn: () => fetchCard(cardName),
    enabled: !!cardName && cardName !== 'Unknown',
    staleTime: Infinity,
    retry: 1,
    select: (data) => {
      if (!data) return null;

      const normalizedRequested = normalizeCardName(cardName);
      const normalizedReturned = normalizeCardName(data.name);

      if (normalizedRequested === normalizedReturned) return data;
      if (isAcceptableFuzzyCardMatch(cardName, data.name)) return data;

      return null;
    },
  });
}

export function useRelatedCards(cardName: string, enabled = true) {
  return useQuery({
    queryKey: ['ygo-related-cards', RELATED_CARD_QUERY_CACHE_VERSION, cardName],
    queryFn: () => fetchRelatedCards(cardName),
    enabled: enabled && !!cardName && cardName !== 'Unknown',
    staleTime: Infinity,
    retry: 1,
  });
}
