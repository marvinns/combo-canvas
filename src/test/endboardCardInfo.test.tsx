import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EndboardBuilder } from '@/components/EndboardBuilder';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: () => ({ data: null, isLoading: false }),
  useRelatedCards: () => ({ data: { cards: [] }, isLoading: false }),
}));

it('opens card info only from the endboard full-screen preview and saves to the selected card note', () => {
  const onCardNoteChange = vi.fn();
  const onOpenSearch = vi.fn();
  render(<EndboardBuilder
    slots={{ 'monster-1': ['Medius'] }} knownCards={[]} activeSlot={null}
    searchQuery="" searchResults={[]} isSearching={false}
    cardNotes={{ 'endboard:monster-1:0': 'Existing reminder' }}
    getCardNoteId={(slot, index) => `endboard:${slot}:${index}`}
    onCardNoteChange={onCardNoteChange} onOpenSearch={onOpenSearch}
    onCloseSearch={vi.fn()} onSearchQueryChange={vi.fn()} onSelectCard={vi.fn()}
    onRemoveCard={vi.fn()} onMoveCard={vi.fn()} onSetSlotCards={vi.fn()}
  />);
  expect(screen.queryByRole('button', { name: 'Edit card info for Medius' })).not.toBeInTheDocument();
  fireEvent.doubleClick(screen.getByLabelText('Add another card to slot containing 1 card; double click Medius for full art view'));
  fireEvent.click(screen.getByRole('button', { name: 'Show card info' }));
  const editor = screen.getByLabelText('Additional information for Medius');
  expect(editor).toHaveValue('Existing reminder');
  fireEvent.change(editor, { target: { value: 'Once per turn used' } });
  expect(onCardNoteChange).toHaveBeenLastCalledWith('endboard:monster-1:0', 'Once per turn used');
  expect(onOpenSearch).not.toHaveBeenCalled();
});
