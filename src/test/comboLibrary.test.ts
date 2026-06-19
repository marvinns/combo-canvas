import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCombinedDeckAssignmentFromTexts,
  createDeckSubsection,
  createDeckAssignment,
  deleteDeckSubsection,
  getComboLibraryBackup,
  type ComboDeckDraftLookupCard,
  getComboDeckDraftText,
  getDeckBlockingErrors,
  getDeckSubsections,
  getSavedCombos,
  importComboLibraryBackup,
  maintainExtraDeckFilter,
  normalizeComboLibraryBackup,
  parseDeckSection,
  renameDeck,
  renameDeckSubsection,
  saveCombo,
  updateCombo,
  validateDeckAssignment,
} from '@/lib/comboLibrary';

function numberedCards(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join('\n');
}

function mockCardLookup(typesByName: Record<string, string>) {
  return async (name: string): Promise<ComboDeckDraftLookupCard | null> => ({
    name,
    type: typesByName[name] || 'Effect Monster',
  });
}

describe('deck assignment helpers', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('parses deck lines with optional copy counts and brackets', () => {
    expect(parseDeckSection('3 Ash Blossom\n2x [Effect Veiler]\nCalled by the Grave')).toEqual([
      { name: 'Ash Blossom', count: 3 },
      { name: 'Called by the Grave', count: 1 },
      { name: 'Effect Veiler', count: 2 },
    ]);
  });

  it('saves and updates endboard slots with their combo', () => {
    const combo = saveCombo(undefined, 'Combo 1', 'Normal Summon [A]', undefined, {
      'monster-1': 'A',
      'spell-3': 'B',
    });

    expect(getSavedCombos()[0].endboardSlots).toEqual({
      'monster-1': 'A',
      'spell-3': 'B',
    });

    const updatedCombo = updateCombo(combo.id, {
      endboardSlots: {
        'monster-2': 'A',
      },
    });

    expect(updatedCombo?.endboardSlots).toEqual({ 'monster-2': 'A' });
    expect(getSavedCombos()[0].endboardSlots).toEqual({ 'monster-2': 'A' });
  });

  it('persists multiple cards in one endboard slot', () => {
    const stackedCards = [
      'The Fallen & The Virtuous',
      'Branded Retribution',
      'Branded in Red',
    ];
    const combo = saveCombo(undefined, 'Branded Endboard', 'Activate [Branded in Red]', undefined, {
      'spell-1': stackedCards,
    });

    expect(getSavedCombos()[0].endboardSlots?.['spell-1']).toEqual(stackedCards);

    const updatedCombo = updateCombo(combo.id, {
      endboardSlots: {
        'spell-2': ['Branded Retribution', 'Branded in Red'],
      },
    });

    expect(updatedCombo?.endboardSlots?.['spell-2']).toEqual(['Branded Retribution', 'Branded in Red']);
    expect(getSavedCombos()[0].endboardSlots?.['spell-2']).toEqual(['Branded Retribution', 'Branded in Red']);
  });

  it('exports and imports combo library backups with endboards, notes, and subsections', () => {
    const combo = saveCombo('Branded', 'Backup Combo', 'Activate [Branded Fusion]', undefined, {
      'spell-1': ['Branded in Red', 'Branded Retribution'],
    });
    const subsection = createDeckSubsection('Branded', '1-card combos')!;
    updateCombo(combo.id, {
      notes: 'Remember the mirror line.',
      subsectionId: subsection.id,
    });

    const backup = getComboLibraryBackup();
    localStorage.clear();

    const imported = importComboLibraryBackup(backup);

    expect(imported.combos).toHaveLength(1);
    expect(getSavedCombos()[0].notes).toBe('Remember the mirror line.');
    expect(getSavedCombos()[0].endboardSlots?.['spell-1']).toEqual(['Branded in Red', 'Branded Retribution']);
    expect(getDeckSubsections('Branded')).toEqual([subsection]);
  });

  it('normalizes committed seed-style backup data', () => {
    const backup = normalizeComboLibraryBackup({
      combos: [{
        id: 'seed-combo',
        deck: 'Branded',
        name: 'Seed Combo',
        text: 'Activate [Seed Card]',
        notes: 'Seed note',
        createdAt: 1,
      }],
      subsections: {
        Branded: [{ id: 'seed-section', name: 'Seed Section' }],
      },
    });

    expect(backup.combos[0].notes).toBe('Seed note');
    expect(backup.subsections.Branded).toEqual([{ id: 'seed-section', name: 'Seed Section' }]);
  });

  it('keeps custom subsections scoped to their deck and migrates them when the deck is renamed', () => {
    const subsection = createDeckSubsection('Heroes', '2-card combos');
    createDeckSubsection('Synchro', '2-card combos');

    expect(subsection).toBeTruthy();
    expect(getDeckSubsections('Heroes')).toEqual([subsection]);
    expect(getDeckSubsections('Synchro')).toHaveLength(1);

    renameDeckSubsection('Heroes', subsection!.id, 'Restricted combos');
    renameDeck('Heroes', 'Elemental Heroes');

    expect(getDeckSubsections('Heroes')).toEqual([]);
    expect(getDeckSubsections('Elemental Heroes')).toEqual([
      { id: subsection!.id, name: 'Restricted combos' },
    ]);
    expect(getDeckSubsections('Synchro')).toHaveLength(1);
  });

  it('uncategorizes combos when their deck subsection is deleted', () => {
    const combo = saveCombo('Heroes', 'Hero Combo', 'Normal Summon [A]');
    const subsection = createDeckSubsection('Heroes', '1-card combos')!;
    updateCombo(combo.id, { subsectionId: subsection.id });

    const combos = deleteDeckSubsection('Heroes', subsection.id);

    expect(combos[0].subsectionId).toBeUndefined();
    expect(getSavedCombos()[0].subsectionId).toBeUndefined();
    expect(getDeckSubsections('Heroes')).toEqual([]);
  });

  it('supports nested deck subsections and deletes child subsection assignments with their parent', () => {
    const combo = saveCombo('Heroes', 'Hero Combo', 'Normal Summon [A]');
    const parent = createDeckSubsection('Heroes', '1-card combos')!;
    const child = createDeckSubsection('Heroes', 'No hand trap line', parent.id)!;
    updateCombo(combo.id, { subsectionId: child.id });

    expect(getDeckSubsections('Heroes')).toEqual([
      parent,
      { ...child, parentId: parent.id },
    ]);

    const combos = deleteDeckSubsection('Heroes', parent.id);

    expect(combos[0].subsectionId).toBeUndefined();
    expect(getSavedCombos()[0].subsectionId).toBeUndefined();
    expect(getDeckSubsections('Heroes')).toEqual([]);
  });

  it('preserves route-specific endboard slot namespaces', () => {
    saveCombo(undefined, 'Branching Combo', '10.1a Activate [A]', undefined, {
      'route:10:1:monster-1': 'A',
      'route:10:1:hand-1': 'C',
      'route:10:2:monster-1': 'B',
    });

    expect(getSavedCombos()[0].endboardSlots).toEqual({
      'route:10:1:monster-1': 'A',
      'route:10:1:hand-1': 'C',
      'route:10:2:monster-1': 'B',
    });
  });

  it('saves and updates step comments with their combo', () => {
    const combo = saveCombo(undefined, 'Combo 1', 'Normal Summon [A]', undefined, undefined, {
      0: { text: 'Play around Ash.', x: 24, y: 40, width: 280 },
    });

    expect(getSavedCombos()[0].stepComments).toEqual({
      0: { text: 'Play around Ash.', x: 24, y: 40, width: 280 },
    });

    const updatedCombo = updateCombo(combo.id, {
      stepComments: {
        1: { text: 'Hold extender.', x: 80, y: 120, width: 320 },
      },
    });

    expect(updatedCombo?.stepComments).toEqual({
      1: { text: 'Hold extender.', x: 80, y: 120, width: 320 },
    });
    expect(getSavedCombos()[0].stepComments).toEqual({
      1: { text: 'Hold extender.', x: 80, y: 120, width: 320 },
    });
  });

  it('accepts a legal assigned deck with optional side deck', () => {
    const deck = createDeckAssignment({
      name: 'Heroes',
      mainText: numberedCards('Hero Main', 40),
      extraText: numberedCards('Hero Extra', 15),
      sideText: '',
    });

    expect(validateDeckAssignment(deck).isValid).toBe(true);
  });

  it('marks underbuilt decks illegal without blocking save', () => {
    const deck = createDeckAssignment({
      name: 'Yummy Snake-Eyes Azamina',
      mainText: '1 Snake-Eye Ash',
      extraText: '',
      sideText: '',
    });

    const validation = validateDeckAssignment(deck);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Main Deck must contain 40 to 60 cards.');
    expect(validation.errors).toContain('Extra Deck must contain 1 to 15 cards.');
    expect(getDeckBlockingErrors(deck)).toEqual([]);
  });

  it('reports illegal deck-building limit violations without blocking save', () => {
    const deck = createDeckAssignment({
      name: 'Yummy Snake-Eyes Azamina',
      mainText: '4 Snake-Eye Ash',
      extraText: '',
      sideText: numberedCards('Side Card', 16),
    });

    const validation = validateDeckAssignment(deck);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Main Deck must contain 40 to 60 cards.');
    expect(validation.errors).toContain('Extra Deck must contain 1 to 15 cards.');
    expect(validation.errors).toContain('Side Deck can contain up to 15 cards.');
    expect(validation.errors).toContain('Snake-Eye Ash appears 4 times. A card can appear no more than 3 times in the assigned deck.');
    expect(getDeckBlockingErrors(deck)).toEqual([]);
  });

  it('blocks cards from appearing in both the main and extra deck', () => {
    const deck = createDeckAssignment({
      name: 'Synchro Pile',
      mainText: [
        'Junk Speeder',
        numberedCards('Main Card', 39),
      ].join('\n'),
      extraText: 'Junk Speeder',
      sideText: '',
    });

    expect(validateDeckAssignment(deck).errors).toContain('Junk Speeder cannot be in both the Main Deck and Extra Deck.');
    expect(getDeckBlockingErrors(deck)).toEqual([]);
  });

  it('blocks saving assigned decks without a name', () => {
    const deck = createDeckAssignment({
      name: '',
      mainText: numberedCards('Main Card', 40),
      extraText: 'Extra Card',
      sideText: '',
    });

    expect(getDeckBlockingErrors(deck)).toEqual(['Deck name is required when assigning a deck.']);
  });

  it('can prefer extra deck cards when creating an assigned deck draft', () => {
    const deck = createDeckAssignment({
      name: 'Synchro Pile',
      mainText: [
        'Junk Synchron',
        'Junk Speeder',
      ].join('\n'),
      extraText: 'Junk Speeder',
      sideText: '',
    }, { preferExtraDeck: true });

    expect(deck.main).toEqual([{ name: 'Junk Synchron', count: 1 }]);
    expect(deck.extra).toEqual([{ name: 'Junk Speeder', count: 1 }]);
    expect(getDeckBlockingErrors(deck)).not.toContain('Junk Speeder cannot be in both the Main Deck and Extra Deck.');
  });

  it('uses card types from lookup data to seed extra deck cards', async () => {
    await expect(getComboDeckDraftText([
      'Normal Summon [Junk Synchron]',
      'Special Summon [Doppelwarrior]',
      'Synchro Summon [Junk Speeder] using [Junk Synchron] and [Doppelwarrior]',
      'Activate [Junk Speeder]',
      'Link Summon [S:P Little Knight]',
    ].join('\n'), {
      lookupCard: mockCardLookup({
        'Junk Speeder': 'Synchro Monster',
        'S:P Little Knight': 'Link Monster',
      }),
    })).resolves.toEqual({
      mainText: [
        '1 Doppelwarrior',
        '1 Junk Synchron',
      ].join('\n'),
      extraText: [
        '1 Junk Speeder',
        '1 S:P Little Knight',
      ].join('\n'),
    });
  });

  it('does not use summon wording to decide extra deck placement', async () => {
    await expect(getComboDeckDraftText([
      'Normal Summon [Junk Synchron]',
      'Synchro Summon [Junk Speeder] using [Junk Synchron]',
    ].join('\n'), {
      lookupCard: mockCardLookup({
        'Junk Speeder': 'Effect Monster',
      }),
    })).resolves.toEqual({
      mainText: [
        '1 Junk Speeder',
        '1 Junk Synchron',
      ].join('\n'),
      extraText: '',
    });
  });

  it('seeds Fusion, Synchro, Xyz, and Link monsters into the extra deck', async () => {
    await expect(getComboDeckDraftText([
      '[Fusion Card]',
      '[Synchro Card]',
      '[Xyz Card]',
      '[Link Card]',
      '[Main Card]',
    ].join('\n'), {
      lookupCard: mockCardLookup({
        'Fusion Card': 'Fusion Effect Monster',
        'Synchro Card': 'Synchro Tuner Monster',
        'Xyz Card': 'XYZ Monster',
        'Link Card': 'Link Monster',
      }),
    })).resolves.toEqual({
      mainText: '1 Main Card',
      extraText: [
        '1 Fusion Card',
        '1 Link Card',
        '1 Synchro Card',
        '1 Xyz Card',
      ].join('\n'),
    });
  });

  it('adds one copy of each mentioned card by default', async () => {
    await expect(getComboDeckDraftText(
      'Activate [Polymerization] to Fusion Summon [Elemental HERO Flame Wingman] using [Elemental HERO Avian] and [Elemental HERO Burstinatrix]',
      {
        lookupCard: mockCardLookup({
          'Elemental HERO Flame Wingman': 'Fusion Monster',
        }),
      },
    )).resolves.toEqual({
      mainText: [
        '1 Elemental HERO Avian',
        '1 Elemental HERO Burstinatrix',
        '1 Polymerization',
      ].join('\n'),
      extraText: '1 Elemental HERO Flame Wingman',
    });
  });

  it('does not inflate generated extra deck copies when rebuilding from an existing assigned deck', async () => {
    const options = {
      lookupCard: mockCardLookup({
        'Elemental HERO Flame Wingman': 'Fusion Monster',
      }),
    };
    const comboText = 'Fusion Summon [Elemental HERO Flame Wingman]';
    const firstDeck = await createCombinedDeckAssignmentFromTexts('Heroes', [comboText], undefined, options);
    const rebuiltDeck = await createCombinedDeckAssignmentFromTexts('Heroes', [comboText], firstDeck, options);

    expect(rebuiltDeck.extra).toEqual([
      { name: 'Elemental HERO Flame Wingman', count: 1 },
    ]);
  });

  it('repairs inflated generated extra deck copies from existing assigned decks', async () => {
    await expect(createCombinedDeckAssignmentFromTexts(
      'Heroes',
      ['Fusion Summon [Elemental HERO Flame Wingman]'],
      {
        name: 'Heroes',
        main: [],
        extra: [{ name: 'Elemental HERO Flame Wingman', count: 3 }],
        side: [],
      },
      {
        lookupCard: mockCardLookup({
          'Elemental HERO Flame Wingman': 'Fusion Monster',
        }),
      },
    )).resolves.toMatchObject({
      extra: [{ name: 'Elemental HERO Flame Wingman', count: 1 }],
    });
  });

  it('builds a shared deck from every combo linked to the deck', async () => {
    await expect(createCombinedDeckAssignmentFromTexts('Shared Deck', [
      'Normal Summon [Starter One]\nLink Summon [Link Climber]',
      'Activate [Starter Two] to add [Search Target]',
    ], undefined, {
      lookupCard: mockCardLookup({
        'Link Climber': 'Link Monster',
      }),
    })).resolves.toEqual({
      name: 'Shared Deck',
      source: 'auto',
      main: [
        { name: 'Search Target', count: 1 },
        { name: 'Starter One', count: 1 },
        { name: 'Starter Two', count: 1 },
      ],
      extra: [
        { name: 'Link Climber', count: 1 },
      ],
      side: [],
    });
  });

  it('caps shared deck card copies at three total', async () => {
    await expect(createCombinedDeckAssignmentFromTexts(
      'Shared Deck',
      ['[Starter One]'],
      {
        name: 'Shared Deck',
        main: [{ name: 'Starter One', count: 3 }],
        extra: [],
        side: [{ name: 'Starter One', count: 2 }],
      },
      { lookupCard: mockCardLookup({}) },
    )).resolves.toMatchObject({
      main: [{ name: 'Starter One', count: 3 }],
      side: [],
    });
  });

  it('maintains the extra deck filter on existing deck assignments', async () => {
    await expect(maintainExtraDeckFilter({
      name: 'Mixed Deck',
      main: [
        { name: 'Main Monster', count: 1 },
        { name: 'Extra Monster', count: 1 },
      ],
      extra: [
        { name: 'Main Spell', count: 1 },
      ],
      side: [],
    }, {
      lookupCard: mockCardLookup({
        'Extra Monster': 'Synchro Monster',
        'Main Spell': 'Spell Card',
      }),
    })).resolves.toEqual({
      name: 'Mixed Deck',
      main: [
        { name: 'Main Monster', count: 1 },
        { name: 'Main Spell', count: 1 },
      ],
      extra: [
        { name: 'Extra Monster', count: 1 },
      ],
      side: [],
    });
  });

  it('maintains the extra deck filter for manual base cards in shared decks', async () => {
    await expect(createCombinedDeckAssignmentFromTexts(
      'Shared Deck',
      ['[Starter One]'],
      {
        name: 'Shared Deck',
        main: [{ name: 'Manual Extra Monster', count: 1 }],
        extra: [{ name: 'Manual Main Monster', count: 1 }],
        side: [],
      },
      {
        lookupCard: mockCardLookup({
          'Manual Extra Monster': 'Fusion Monster',
          'Manual Main Monster': 'Effect Monster',
        }),
      },
    )).resolves.toMatchObject({
      main: [
        { name: 'Manual Main Monster', count: 1 },
        { name: 'Starter One', count: 1 },
      ],
      extra: [
        { name: 'Manual Extra Monster', count: 1 },
      ],
    });
  });

  it('uses fuzzy YGOPRO lookup results for extra deck filtering', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const href = String(url);

      if (href.includes('cardinfo.php?name=')) {
        return {
          ok: false,
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          data: [
            {
              name: 'Elemental HERO Flame Wingman',
              type: 'Fusion Monster',
            },
          ],
        }),
      } as Response;
    });

    await expect(getComboDeckDraftText('[Elemental HERO Flame Wingman]')).resolves.toEqual({
      mainText: '',
      extraText: '1 Elemental HERO Flame Wingman',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
