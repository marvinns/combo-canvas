import { useQuery } from '@tanstack/react-query';

interface YGOCard {
  id: number;
  name: string;
  card_images: { id: number; image_url: string; image_url_small: string; image_url_cropped: string }[];
}

async function fetchCard(name: string): Promise<{ imageUrl: string; name: string } | null> {
  if (!name || name === 'Unknown') return null;
  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      // Try fuzzy search
      const fuzzy = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`);
      if (!fuzzy.ok) return null;
      const data = await fuzzy.json();
      const card: YGOCard = data.data[0];
      return { imageUrl: card.card_images[0].image_url, name: card.name };
    }
    const data = await res.json();
    const card: YGOCard = data.data[0];
    return { imageUrl: card.card_images[0].image_url, name: card.name };
  } catch {
    return null;
  }
}

export function useCardImage(cardName: string) {
  return useQuery({
    queryKey: ['ygo-card', cardName],
    queryFn: () => fetchCard(cardName),
    enabled: !!cardName && cardName !== 'Unknown',
    staleTime: Infinity,
    retry: 1,
  });
}
