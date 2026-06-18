import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Index from '@/pages/Index';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: () => ({ data: null, isLoading: false }),
  useRelatedCards: () => ({ data: { cards: [] }, isLoading: false }),
}));

vi.mock('@/components/SideRays', () => ({
  SideRays: () => null,
}));

describe('Index full mode desktop breakdown', () => {
  it('preserves the selected combo-library deck after hide and show', () => {
    localStorage.clear();
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      name: 'Hero Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<Index />);

    const libraryToggle = screen.getByRole('button', { name: /Combo Library/ });
    fireEvent.click(libraryToggle);
    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(libraryToggle);
    fireEvent.click(libraryToggle);

    expect(screen.getByDisplayValue('Heroes')).toBeInTheDocument();
    localStorage.clear();
  }, 15000);

  it('opens full mode on desktop and navigates steps with keyboard arrows', () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByText('Full Mode'));

    expect(screen.getAllByText('Step 1 / 3').length).toBeGreaterThan(0);
    expect(screen.getByText('Use Left/Right arrows')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getAllByText('Step 2 / 3').length).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getAllByText('Step 1 / 3').length).toBeGreaterThan(0);
  }, 15000);

  it('opens the endboard builder and fills a slot from known combo cards', () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));
    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));

    expect(screen.queryByText('Add card')).not.toBeInTheDocument();
    expect(screen.getAllByText('Diabellze the White Witch').length).toBeGreaterThan(0);
  }, 15000);

  it('optionally displays and retains cards in hand on the endboard', () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));

    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(16);
    fireEvent.click(screen.getByRole('button', { name: 'Show Hand' }));
    expect(screen.getByText('Cards in hand')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(22);

    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[16]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));

    fireEvent.click(screen.getByRole('button', { name: 'Hide Hand' }));
    expect(screen.queryByText('Cards in hand')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show Hand' }));
    expect(screen.getAllByText('Diabellze the White Witch').length).toBeGreaterThan(0);
  }, 15000);

  it('opens a full art preview when double clicking an endboard slot card', () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));
    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));

    fireEvent.doubleClick(screen.getByLabelText('Add another card to slot containing 1 card; double click Diabellze the White Witch for full art view'));

    expect(screen.queryByText('Add card')).not.toBeInTheDocument();
    expect(screen.getByText('Full screen preview for Diabellze the White Witch')).toBeInTheDocument();
  }, 15000);

  it('shows related cards from an endboard full art preview', () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));
    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));
    fireEvent.doubleClick(screen.getByLabelText('Add another card to slot containing 1 card; double click Diabellze the White Witch for full art view'));
    fireEvent.click(screen.getByLabelText('Show related cards'));

    expect(screen.getByText('Related cards')).toBeInTheDocument();
    expect(screen.getByText('No related cards found for this card.')).toBeInTheDocument();
  }, 15000);

  it('adds multiple cards to one endboard slot and removes the top card first', async () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));
    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));

    fireEvent.click(screen.getByLabelText('Add another card to slot containing 1 card; double click Diabellze the White Witch for full art view'));
    await waitFor(() => expect(screen.getByText('Add card')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Susurrus of the Sinful Spoils'));

    expect(screen.getByText('2 cards')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Susurrus of the Sinful Spoils from endboard slot')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('View all 2 cards in endboard slot'));
    expect(screen.getByText('Cards in this slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview Diabellze the White Witch from endboard slot')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Preview Diabellze the White Witch from endboard slot'));
    expect(screen.getByText('Full screen preview for Diabellze the White Witch')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByLabelText('Remove Susurrus of the Sinful Spoils from endboard slot'));

    expect(screen.queryByText('2 cards')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remove Diabellze the White Witch from endboard slot')).toBeInTheDocument();
  }, 15000);

  it('edits cards and their order from the endboard stack browser', async () => {
    render(<Index />);

    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));
    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByText('Diabellze the White Witch'));
    fireEvent.click(screen.getByLabelText('Add another card to slot containing 1 card; double click Diabellze the White Witch for full art view'));
    await waitFor(() => expect(screen.getByText('Add card')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Susurrus of the Sinful Spoils'));
    fireEvent.click(screen.getByLabelText('View all 2 cards in endboard slot'));

    fireEvent.click(screen.getByLabelText('Move Susurrus of the Sinful Spoils toward bottom'));
    expect(screen.getByLabelText('Move Susurrus of the Sinful Spoils toward bottom')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Replace Diabellze the White Witch'));
    fireEvent.click(screen.getByRole('button', { name: 'Guiding Light' }));
    expect(screen.getByLabelText('Replace Guiding Light')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Diabellze the White Witch' }));
    expect(screen.getByLabelText('Remove Diabellze the White Witch from stack')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove Guiding Light from stack'));
    expect(screen.queryByLabelText('Replace Guiding Light')).not.toBeInTheDocument();
  }, 15000);

  it('replaces the full bracket contents when applying a card suggestion inside an existing name', async () => {
    const { container } = render(<Index />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

    editor.innerHTML = 'Activate [Diazzzz]<br>Special Summon [Diabellze the White Witch]';
    fireEvent.input(editor);

    await waitFor(() => expect(editor.innerHTML).toContain('Diazzzz'));

    const firstTextNode = editor.firstChild as Text;
    const range = document.createRange();
    const cursorOffset = 'Activate [Dia'.length;
    range.setStart(firstTextNode, cursorOffset);
    range.setEnd(firstTextNode, cursorOffset);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.keyUp(editor);
    fireEvent.click(screen.getByText('[Diabellze the White Witch]'));

    await waitFor(() => {
      expect(editor.textContent).toContain('Activate [Diabellze the White Witch]');
      expect(editor.textContent).not.toContain('Diazzzz');
    });
    expect(editor.textContent).toContain('Special Summon [Diabellze the White Witch]');
  }, 15000);
});
