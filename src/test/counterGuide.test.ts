import { beforeEach, describe, expect, it } from 'vitest';
import { getCounterGuideData, saveCounterGuideData, type CounterGuideData } from '@/lib/counterGuide';

describe('counter guide deck thumbnails', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves the selected thumbnail card name for a counter deck', () => {
    const guideData: CounterGuideData = {
      decks: [{
        id: 'test-deck',
        name: 'Test Deck',
        tier: 'Rogue',
        thumbnailCardName: 'Test Thumbnail Card',
        endboard: [],
        plan: '',
      }],
      counterCards: [],
      pairings: [],
    };

    const saved = saveCounterGuideData(guideData);

    expect(saved.decks[0].thumbnailCardName).toBe('Test Thumbnail Card');
    expect(getCounterGuideData().decks[0].thumbnailCardName).toBe('Test Thumbnail Card');
  });

  it('fills missing built-in deck thumbnail card names from defaults', () => {
    const guideData: CounterGuideData = {
      decks: [{
        id: 'ryzeal',
        name: 'Ryzeal',
        tier: 'Tier 1',
        endboard: ['Ryzeal Detonator'],
        plan: '',
      }],
      counterCards: [],
      pairings: [],
    };

    saveCounterGuideData(guideData);

    expect(getCounterGuideData().decks[0].thumbnailCardName).toBe('Ryzeal Detonator');
  });

  it('preserves trailing spaces while deck counter text fields are being edited', () => {
    const guideData: CounterGuideData = {
      decks: [{
        id: 'kewl-tunes',
        name: 'Kewl ',
        tier: 'Tier 1',
        thumbnailCardName: 'Kewl ',
        endboard: ['Nibiru, '],
        plan: '',
      }],
      counterCards: [{
        id: 'ash-blossom',
        name: 'Ash Blossom ',
        category: 'Handtrap',
      }],
      pairings: [{
        id: 'kewl-ash',
        deckId: 'kewl-tunes',
        counterCardIds: ['ash-blossom'],
        counteredCard: 'Nibiru, ',
        counteredCards: ['Nibiru, '],
        impact: 'High',
        summary: '',
        timing: '',
        tags: ['board '],
      }],
    };

    saveCounterGuideData(guideData);
    const saved = getCounterGuideData();

    expect(saved.decks[0].name).toBe('Kewl ');
    expect(saved.decks[0].thumbnailCardName).toBe('Kewl ');
    expect(saved.decks[0].endboard[0]).toBe('Nibiru, ');
    expect(saved.counterCards[0].name).toBe('Ash Blossom ');
    expect(saved.pairings[0].counteredCards?.[0]).toBe('Nibiru, ');
    expect(saved.pairings[0].tags[0]).toBe('board ');
  });
});
