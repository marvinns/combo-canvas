export interface SavedCombo {
  id: string;
  deck: string;
  name: string;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = 'ygo-combo-library';
const DEFAULT_DECK = 'General';

function normalizeSavedCombo(combo: Partial<SavedCombo>): SavedCombo | null {
  if (!combo.id || !combo.name || !combo.text || !combo.createdAt) return null;

  return {
    id: combo.id,
    deck: combo.deck?.trim() || DEFAULT_DECK,
    name: combo.name,
    text: combo.text,
    createdAt: combo.createdAt,
  };
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

export function saveCombo(deck: string, name: string, text: string): SavedCombo {
  const combos = getSavedCombos();
  const combo: SavedCombo = {
    id: crypto.randomUUID(),
    deck: deck.trim() || DEFAULT_DECK,
    name,
    text,
    createdAt: Date.now(),
  };
  combos.unshift(combo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return combo;
}

export function updateCombo(id: string, updates: Partial<Pick<SavedCombo, 'deck' | 'name' | 'text'>>): SavedCombo | null {
  const combos = getSavedCombos();
  const comboIndex = combos.findIndex((combo) => combo.id === id);
  if (comboIndex === -1) return null;

  const existingCombo = combos[comboIndex];
  const updatedCombo: SavedCombo = {
    ...existingCombo,
    deck: updates.deck !== undefined ? updates.deck.trim() || DEFAULT_DECK : existingCombo.deck,
    name: updates.name !== undefined ? updates.name : existingCombo.name,
    text: updates.text !== undefined ? updates.text : existingCombo.text,
  };

  combos[comboIndex] = updatedCombo;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return updatedCombo;
}

export function renameDeck(oldDeck: string, newDeck: string): SavedCombo[] {
  const trimmedNewDeck = newDeck.trim() || DEFAULT_DECK;
  const combos = getSavedCombos().map((combo) =>
    combo.deck === oldDeck
      ? { ...combo, deck: trimmedNewDeck }
      : combo,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
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
