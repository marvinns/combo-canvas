export interface SavedCombo {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = 'ygo-combo-library';

export function getSavedCombos(): SavedCombo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCombo(name: string, text: string): SavedCombo {
  const combos = getSavedCombos();
  const combo: SavedCombo = { id: crypto.randomUUID(), name, text, createdAt: Date.now() };
  combos.unshift(combo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
  return combo;
}

export function deleteCombo(id: string) {
  const combos = getSavedCombos().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
}
