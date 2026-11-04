import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeckCounterGuide } from '@/components/DeckCounterGuide';
import { getCounterComments, saveCounterComments, getCounterGuideData, getPairingCounterCardIds, saveCounterGuideData, type CounterGuideData } from '@/lib/counterGuide';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: (name: string) => ({
    data: name
      ? {
          name,
          imageUrl: `/cards/${name}.jpg`,
          croppedImageUrl: `/cards/${name}-crop.jpg`,
        }
      : null,
    isLoading: false,
  }),
  useRelatedCards: () => ({ data: { cards: [] }, isLoading: false }),
}));

describe('DeckCounterGuide targetless matchups', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('confirms deck deletion, removes related data, and persists an empty guide', async () => {
    saveCounterGuideData({
      decks: ['first', 'second'].map((id) => ({ id, name: id, tier: 'Rogue', endboard: [], plan: '' })),
      counterCards: [{ id: 'ash', name: 'Ash Blossom', category: 'Handtrap' }],
      pairings: ['first', 'second'].map((id) => ({
        id, deckId: id, counterCardId: 'ash', counteredCard: '',
        impact: 'High', summary: id, timing: '', tags: [],
      })),
    });
    saveCounterComments(['first', 'second'].map((id) => ({ id, pairingId: id, text: id, createdAt: 1, updatedAt: 1 })));
    const view = render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Deck' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(getCounterGuideData().decks).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Deck' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete deck' }));
    expect(getCounterGuideData().decks.map((deck) => deck.id)).toEqual(['second']);
    expect(getCounterGuideData().pairings.map((pairing) => pairing.id)).toEqual(['second']);
    expect(getCounterComments().map((comment) => comment.id)).toEqual(['second']);
    expect(screen.getByRole('heading', { name: 'second' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Deck' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete deck' }));
    expect(getCounterGuideData().decks).toEqual([]);
    expect(getCounterGuideData().counterCards).toHaveLength(1);
    view.unmount();
    render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    expect(await screen.findByText('No decks yet. Add a deck to start building your counter guide.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add deck' }));
    expect(getCounterGuideData().decks).toHaveLength(1);
  });

  it('keeps other slots intact while searching, selecting, replacing, and reloading', async () => {
    const slots = { 'monster-1': ['Alpha', 'Beta'], 'monster-3': 'Gamma', 'hand-2': 'Alpha' };
    saveCounterGuideData({
      decks: [{ id: 'test', name: 'Test Deck', tier: 'Rogue', endboard: ['Alpha', 'Beta', 'Gamma'], endboardSlots: slots, plan: '' }],
      counterCards: [], pairings: [],
    });
    const view = render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Remove Gamma from endboard slot' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add card to endboard slot' })[0]);
    const input = screen.getByPlaceholderText('Search card name...');
    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    // Even a stray click on a background delete control must be harmless.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gamma from endboard slot' }));
    expect(getCounterGuideData().decks[0].endboardSlots).toEqual(slots);
    fireEvent.click(screen.getByRole('button', { name: 'Alpha Known card' }));
    const added = { ...slots, 'top-left': 'Alpha' };
    expect(getCounterGuideData().decks[0].endboardSlots).toEqual(added);
    fireEvent.click(screen.getByRole('button', { name: 'View all 2 cards in endboard slot' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Cards in this slot' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Replace Beta' }));
    fireEvent.change(dialog.getByPlaceholderText('Search card name...'), { target: { value: 'G' } });
    expect(getCounterGuideData().decks[0].endboardSlots).toEqual(added);
    fireEvent.click(dialog.getByRole('button', { name: 'Gamma' }));
    const replaced = { ...added, 'monster-1': ['Alpha', 'Gamma'] };
    expect(getCounterGuideData().decks[0].endboardSlots).toEqual(replaced);
    view.unmount();
    render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    await screen.findByRole('button', { name: 'View all 2 cards in endboard slot' });
    expect(getCounterGuideData().decks[0].endboardSlots).toEqual(replaced);
  });

  it('manages saved counters globally and clears a deleted counter filter', async () => {
    saveCounterGuideData({
      decks: [{ id: 'test', name: 'Test Deck', tier: 'Rogue', endboard: [], plan: '' }],
      counterCards: [{ id: 'eff', name: 'Eff', category: 'Handtrap' }],
      pairings: ['first', 'second'].map((id) => ({
        id, deckId: 'test', counterCardId: 'eff', counteredCard: '',
        impact: 'High', summary: id, timing: '', tags: [],
      })),
    });
    render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    const option = await screen.findByRole('option', { name: 'Eff' });
    const filter = option.closest('select')!;
    fireEvent.change(filter, { target: { value: 'eff' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manage Counters' }));
    const manager = within(screen.getByRole('dialog', { name: 'Manage Counters' }));
    expect(manager.getByText('Handtrap · Used in 2 matchups')).toBeInTheDocument();
    const name = manager.getByRole('textbox', { name: 'Saved counter name: Eff' });
    fireEvent.change(name, { target: { value: 'Effect Veiler' } });
    fireEvent.blur(name);
    expect(getCounterGuideData().counterCards).toEqual([{ id: 'eff', name: 'Effect Veiler', category: 'Handtrap' }]);
    expect(getCounterGuideData().pairings.map(getPairingCounterCardIds)).toEqual([['eff'], ['eff']]);
    const search = manager.getByRole('textbox', { name: 'Search saved counters' });
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(manager.getByText('No saved counters match your search.')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'veiler' } });
    fireEvent.click(manager.getByRole('button', { name: 'Delete saved counter Effect Veiler' }));
    const confirmation = within(screen.getByRole('dialog', { name: 'Delete Effect Veiler?' }));
    expect(confirmation.getByText('first')).toBeInTheDocument();
    expect(confirmation.getByText('second')).toBeInTheDocument();
    fireEvent.click(confirmation.getByRole('button', { name: 'Delete saved card' }));
    expect(getCounterGuideData().counterCards).toEqual([]);
    expect(getCounterGuideData().pairings.map(getPairingCounterCardIds)).toEqual([[], []]);
    expect(filter).toHaveValue('all');
  });

  it('keeps name drafts local and replaces a shared counter only in the edited matchup', async () => {
    saveCounterGuideData({
      decks: [{ id: 'test', name: 'Test Deck', tier: 'Rogue', endboard: [], plan: '' }],
      counterCards: [{ id: 'ash', name: 'Ash Blossom', category: 'Handtrap' }],
      pairings: ['first', 'second'].map((id) => ({
        id, deckId: 'test', counterCardId: 'ash', counteredCard: 'Target',
        impact: 'High', summary: id, timing: '', tags: [],
      })),
    });
    render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    const editors = await screen.findAllByRole('button', { name: 'Edit pairing' });
    fireEvent.click(editors[1]);
    const input = screen.getByRole('textbox', { name: 'Counter card name' });
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'D.D. Crow' } });
    fireEvent.blur(input);
    expect(screen.getByRole('textbox', { name: 'Counter card name' })).toHaveValue('D.D. Crow');
    expect(screen.getAllByAltText('Ash Blossom').length).toBeGreaterThan(0);
    const target = screen.getByRole('textbox', { name: 'Countered card name' });
    fireEvent.change(target, { target: { value: '' } });
    expect(target).toHaveValue('');
    fireEvent.change(target, { target: { value: 'Replacement Target' } });
    fireEvent.blur(target);
    expect(screen.getByRole('textbox', { name: 'Countered card name' })).toHaveValue('Replacement Target');
    const replacement = screen.getByRole('textbox', { name: 'Counter card name' });
    fireEvent.change(replacement, { target: { value: '' } });
    fireEvent.blur(replacement);
    expect(screen.queryByRole('textbox', { name: 'Counter card name' })).not.toBeInTheDocument();
    expect(screen.getAllByAltText('Ash Blossom').length).toBeGreaterThan(0);
    const saved = getCounterGuideData();
    expect(saved.counterCards.find((card) => card.id === 'ash')?.name).toBe('Ash Blossom');
    expect(getPairingCounterCardIds(saved.pairings.find((pairing) => pairing.id === 'first')!)).toEqual(['ash']);
    expect(getPairingCounterCardIds(saved.pairings.find((pairing) => pairing.id === 'second')!)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved suggestion Ash Blossom' }));
    const confirmation = within(screen.getByRole('dialog', { name: 'Delete Ash Blossom?' }));
    expect(confirmation.getByText('first')).toBeInTheDocument();
    fireEvent.click(confirmation.getByRole('button', { name: 'Cancel' }));
    expect(getCounterGuideData().counterCards.some((card) => card.id === 'ash')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved suggestion D.D. Crow' }));
    expect(screen.queryByRole('button', { name: 'Delete saved suggestion D.D. Crow' })).not.toBeInTheDocument();
    expect(getCounterGuideData().counterCards.some((card) => card.name === 'D.D. Crow')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved suggestion Ash Blossom' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved card' }));
    const afterDeletion = getCounterGuideData();
    expect(afterDeletion.counterCards.some((card) => card.id === 'ash')).toBe(false);
    expect(afterDeletion.pairings).toHaveLength(2);
    expect(getPairingCounterCardIds(afterDeletion.pairings.find((pairing) => pairing.id === 'first')!)).toEqual([]);
    expect(afterDeletion.pairings.find((pairing) => pairing.id === 'first')?.summary).toBe('first');
  });

  it('opens all saved handtrap matchups with timing, targets, and paired counters', async () => {
    saveCounterGuideData({
      decks: [
        { id: 'a', name: 'Deck A', tier: 'Tier 1', endboard: [], plan: '' },
        { id: 'b', name: 'Deck B', tier: 'Rogue', endboard: [], plan: '' },
      ],
      counterCards: [
        { id: 'ash', name: 'Ash Blossom', category: 'Handtrap' },
        { id: 'crow', name: 'D.D. Crow', category: 'Handtrap' },
        { id: 'empty', name: 'Unused Handtrap', category: 'Handtrap' },
      ],
      pairings: [
        { id: 'one', deckId: 'a', counterCardId: 'ash', counteredCard: 'Starter A', impact: 'High', summary: 'Stops the search.', timing: 'Chain to the starter.', tags: [] },
        { id: 'two', deckId: 'b', counterCardIds: ['ash', 'crow'], counteredCard: '', impact: 'Medium', summary: 'Limits follow-up.', timing: 'Wait for the second effect.', tags: ['Follow-up'] },
      ],
    });
    render(<MemoryRouter><DeckCounterGuide /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'View matchups for Ash Blossom' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Deck A')).toBeInTheDocument();
    expect(dialog.getByText('Deck B')).toBeInTheDocument();
    expect(dialog.getAllByText('Starter A', { exact: false }).length).toBeGreaterThan(0);
    const deckA = within(dialog.getByRole('region', { name: 'Deck A matchups' }));
    expect(deckA.getByAltText('Ash Blossom')).toBeInTheDocument();
    expect(deckA.getByAltText('Starter A')).toBeInTheDocument();
    fireEvent.doubleClick(deckA.getByAltText('Ash Blossom'));
    const counterPreview = within(screen.getByRole('dialog', { name: 'Ash Blossom' }));
    expect(counterPreview.getByAltText('Ash Blossom')).toBeInTheDocument();
    expect(counterPreview.getByRole('button', { name: 'Show related cards' })).toBeInTheDocument();
    fireEvent.click(counterPreview.getByRole('button', { name: 'Close' }));
    fireEvent.doubleClick(deckA.getByAltText('Starter A'));
    const targetPreview = within(screen.getByRole('dialog', { name: 'Starter A' }));
    expect(targetPreview.getByAltText('Starter A')).toBeInTheDocument();
    expect(targetPreview.getByRole('button', { name: 'Show card info' })).toBeInTheDocument();
    fireEvent.click(targetPreview.getByRole('button', { name: 'Close' }));
    const deckB = within(dialog.getByRole('region', { name: 'Deck B matchups' }));
    expect(deckB.getByAltText('Ash Blossom')).toBeInTheDocument();
    expect(deckB.queryByText('No target selected')).not.toBeInTheDocument();
    fireEvent.click(deckB.getByRole('button', { name: '2 cards' }));
    expect(deckB.getByRole('button', { name: '2 cards' })).toHaveAttribute('aria-expanded', 'true');
    expect(dialog.getByText('Chain to the starter.', { exact: false })).toBeInTheDocument();
    expect(dialog.getByText('Wait for the second effect.', { exact: false })).toBeInTheDocument();
    expect(dialog.getAllByText('D.D. Crow', { exact: false }).length).toBeGreaterThan(0);
    expect(dialog.getByText('Medium impact')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'View matchups for Unused Handtrap' }));
    expect(within(screen.getByRole('dialog')).getByText('No matchup guidance saved for this handtrap yet.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).queryByText('Deck A')).not.toBeInTheDocument();
  });

  it('shows only the activated counter card art when a matchup has no countered cards', async () => {
    const guideData: CounterGuideData = {
      decks: [{
        id: 'targetless-deck',
        name: 'Targetless Deck',
        tier: 'Rogue',
        thumbnailCardName: 'Starter',
        endboard: [],
        plan: '',
      }],
      counterCards: [{
        id: 'droll-lock-bird',
        name: 'Droll & Lock Bird',
        category: 'Handtrap',
      }],
      pairings: [{
        id: 'targetless-droll',
        deckId: 'targetless-deck',
        counterCardIds: ['droll-lock-bird'],
        counteredCard: '',
        counteredCards: [],
        impact: 'High',
        summary: 'Stops the turn through activation timing.',
        timing: 'Use after the first add resolves.',
        tags: [],
      }],
    };

    saveCounterGuideData(guideData);

    const { container } = render(
      <MemoryRouter>
        <DeckCounterGuide />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getAllByText('Droll & Lock Bird').length).toBeGreaterThan(0));

    expect(screen.queryByText('No target selected')).not.toBeInTheDocument();
    expect(screen.queryByText('into')).not.toBeInTheDocument();
    expect(screen.getByText('activation')).toBeInTheDocument();
    expect(container.querySelector('.activate-cursor')).toBeInTheDocument();
  });
});
