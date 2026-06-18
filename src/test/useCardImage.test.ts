import { describe, expect, it } from 'vitest';

import {
  isAcceptableFuzzyCardMatch,
  resolveCardLookupName,
  shouldAttemptFuzzyCardMatch,
} from '@/hooks/useCardImage';

describe('useCardImage fuzzy matching guards', () => {
  it('does not attempt fuzzy matching for very short card fragments', () => {
    expect(shouldAttemptFuzzyCardMatch('a')).toBe(false);
    expect(shouldAttemptFuzzyCardMatch('k9')).toBe(false);
    expect(shouldAttemptFuzzyCardMatch('card')).toBe(false);
    expect(shouldAttemptFuzzyCardMatch('Card A')).toBe(false);
  });

  it('allows fuzzy matching for plausible shorthand names', () => {
    expect(shouldAttemptFuzzyCardMatch('stratos')).toBe(true);
    expect(shouldAttemptFuzzyCardMatch('vyon')).toBe(true);
    expect(shouldAttemptFuzzyCardMatch('cupsy')).toBe(true);
    expect(shouldAttemptFuzzyCardMatch('hero neos')).toBe(true);
    expect(shouldAttemptFuzzyCardMatch('flame wingman')).toBe(true);
  });

  it('rejects unrelated fuzzy matches for short accidental fragments', () => {
    expect(isAcceptableFuzzyCardMatch('a', 'A Case for K9')).toBe(false);
    expect(isAcceptableFuzzyCardMatch('card', 'A Case for K9')).toBe(false);
  });

  it('accepts fuzzy matches that preserve all requested name tokens', () => {
    expect(isAcceptableFuzzyCardMatch('stratos', 'Elemental HERO Stratos')).toBe(true);
    expect(isAcceptableFuzzyCardMatch('vyon', 'Vision HERO Vyon')).toBe(true);
    expect(isAcceptableFuzzyCardMatch('cupsy', 'Cupsy Yummy')).toBe(true);
    expect(isAcceptableFuzzyCardMatch('hero neos', 'Elemental HERO Neos')).toBe(true);
    expect(isAcceptableFuzzyCardMatch('flame wingman', 'Elemental HERO Flame Wingman')).toBe(true);
  });

  it('normalizes known alias names for lookup', () => {
    expect(resolveCardLookupName('the hallowed Azamina')).toBe('The Hallowed Azamina');
    expect(resolveCardLookupName('Sinful spoils of the white forest')).toBe('Sinful Spoils of the White Forest');
    expect(resolveCardLookupName('Azamina ilia')).toBe('Azamina Ilia');
  });
});
