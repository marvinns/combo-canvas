import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComboLibrary } from '@/components/ComboLibrary';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: () => ({ data: undefined, isLoading: false }),
}));

function createComboDragData() {
  return {
    types: ['application/x-combo-id'],
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}

describe('ComboLibrary view toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      name: 'Compact Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));
  });

  it('switches to a persistent compact list that loads combos by row', () => {
    const onLoad = vi.fn();
    const { unmount } = render(<ComboLibrary currentText="" onLoad={onLoad} />);

    expect(screen.getByLabelText('Show card view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Copy')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show compact list view'));

    expect(screen.getByLabelText('Show compact list view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(localStorage.getItem('combo-library-view')).toBe('compact');

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: '__unassigned__' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compact Combo' }));
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 'combo-1' }));

    unmount();
    render(<ComboLibrary currentText="" onLoad={onLoad} />);

    expect(screen.getByLabelText('Show compact list view')).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports compact-view combo actions without exposing thumbnail changes', async () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      assignedDeck: {
        name: 'Heroes',
        source: 'manual',
        main: [],
        extra: [],
        side: [],
      },
      thumbnailCardName: 'Existing Thumbnail',
      name: 'Compact Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Heroes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));
    expect(screen.getByRole('button', { name: 'Hide Deck' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Deck' }));

    fireEvent.click(screen.getByTitle('Rename'));
    expect(screen.queryByPlaceholderText('Thumbnail card name...')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Combo name...'), { target: { value: 'Renamed Compact Combo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getAllByText('Renamed Compact Combo').length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].thumbnailCardName).toBe('Existing Thumbnail');

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getAllByText('Renamed Compact Combo Copy').length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)).toHaveLength(2);

    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)).toHaveLength(1));
  });

  it('opens and saves combo notes from the info button in card and compact views', async () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-notes',
      deck: 'Branded',
      name: 'Notes Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Open notes for Notes Combo'));
    expect(screen.getByText('Notes for Notes Combo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Combo notes'), {
      target: { value: 'Remember the anti-Nibiru line.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].notes).toBe('Remember the anti-Nibiru line.');
      expect(screen.getByText('Remember the anti-Nibiru line.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    fireEvent.click(screen.getByLabelText('Open notes for Notes Combo'));

    expect(screen.getByLabelText('Combo notes')).toHaveValue('Remember the anti-Nibiru line.');
  });

  it('navigates All Decks as deck, subsection, then combo hierarchy', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      {
        id: 'hero-combo',
        deck: 'Heroes',
        subsectionId: 'one-card',
        name: 'Hero Combo',
        text: 'Activate [Hero Card]',
        createdAt: 1,
      },
      {
        id: 'synchro-combo',
        deck: 'Synchro',
        name: 'Synchro Combo',
        text: 'Activate [Synchro Card]',
        createdAt: 2,
      },
    ]));
    localStorage.setItem('ygo-combo-library-subsections', JSON.stringify({
      Heroes: [{ id: 'one-card', name: '1-card combos' }],
    }));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));

    expect(screen.getByRole('button', { name: 'Heroes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Synchro' })).toBeInTheDocument();
    expect(screen.queryByText('Hero Combo')).not.toBeInTheDocument();
    expect(screen.queryByText('Synchro Combo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Heroes' }));
    expect(screen.getByRole('button', { name: '1-card combos' })).toBeInTheDocument();
    expect(screen.queryByText('Hero Combo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1-card combos' }));
    expect(screen.getByText('Hero Combo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Synchro' }));
    expect(screen.getByText('Synchro Combo')).toBeInTheDocument();
    expect(screen.queryByText('Hero Combo')).not.toBeInTheDocument();
  });

  it('uses the subsection tree when a deck with subsections is selected', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      {
        id: 'categorized',
        deck: 'Branded',
        subsectionId: 'one-card',
        name: 'Branded Starter',
        text: 'Activate [Branded Card]',
        createdAt: 1,
      },
      {
        id: 'uncategorized',
        deck: 'Branded',
        name: 'Branded Follow-up',
        text: 'Activate [Follow-up Card]',
        createdAt: 2,
      },
    ]));
    localStorage.setItem('ygo-combo-library-subsections', JSON.stringify({
      Branded: [{ id: 'one-card', name: '1-card combos' }],
    }));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Branded' } });

    expect(screen.getByRole('button', { name: '1-card combos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uncategorized' })).toBeInTheDocument();
    expect(screen.queryByText('Branded Starter')).not.toBeInTheDocument();
    expect(screen.queryByText('Branded Follow-up')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1-card combos' }));
    expect(screen.getByText('Branded Starter')).toBeInTheDocument();
    expect(screen.queryByText('Branded Follow-up')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Uncategorized' }));
    expect(screen.getByText('Branded Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Branded Starter')).toBeInTheDocument();
  });

  it('uses consistent named deck colors across the All Decks tree', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'branded', deck: 'Branded', name: 'Branded Combo', text: '[A]', createdAt: 1 },
      { id: 'hero', deck: 'Hero', name: 'Hero Combo', text: '[B]', createdAt: 2 },
      { id: 'lunalight', deck: 'Lunalight', name: 'Lunalight Combo', text: '[C]', createdAt: 3 },
    ]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));

    expect(screen.getByRole('button', { name: 'Branded' }).querySelector('span')).toHaveClass('text-red-300');
    expect(screen.getByRole('button', { name: 'Hero' }).querySelector('span')).toHaveClass('text-amber-300');
    expect(screen.getByRole('button', { name: 'Lunalight' }).querySelector('span')).toHaveClass('text-slate-300');
  });

  it('lets users override a deck color from the All Decks palette everywhere', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'branded', deck: 'Branded', name: 'Branded Combo', text: '[A]', createdAt: 1 },
    ]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByLabelText('Change Branded color'));
    fireEvent.click(screen.getByLabelText('Set Branded color to Blue'));

    expect(screen.getByRole('button', { name: 'Branded' }).querySelector('span')).toHaveClass('text-blue-300');
    expect(JSON.parse(localStorage.getItem('combo-library-deck-colors')!)).toEqual({ Branded: 'blue' });

    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    expect(screen.getByTitle('Branded')).toHaveClass('text-blue-300');

    fireEvent.click(screen.getByLabelText('Show card view'));
    expect(screen.getAllByText('Branded').some((node) => node.classList.contains('text-blue-300'))).toBe(true);
  });

  it('creates deck-scoped subsections and assigns combos through the edit flow', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      name: 'Hero Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Subsection' }));
    fireEvent.change(screen.getByPlaceholderText('Subsection name, e.g. 2-card combos...'), {
      target: { value: '1-card combos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByLabelText('Selected subsection')).toHaveValue('all');
    fireEvent.click(screen.getByTitle('Rename'));
    const subsectionId = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes[0].id;
    fireEvent.change(screen.getByLabelText('Combo subsection'), {
      target: { value: subsectionId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.change(screen.getByLabelText('Selected subsection'), { target: { value: subsectionId } });
    expect(screen.getByText('Hero Combo')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].subsectionId).toBe(subsectionId);
  });

  it('creates nested subsections under the selected subsection and assigns combos to them', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      name: 'Hero Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Subsection' }));
    fireEvent.change(screen.getByPlaceholderText('Subsection name, e.g. 2-card combos...'), {
      target: { value: '1-card combos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const parentId = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes[0].id;
    fireEvent.change(screen.getByLabelText('Selected subsection'), { target: { value: parentId } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Nested Subsection' }));
    fireEvent.change(screen.getByPlaceholderText('Subsection under 1-card combos...'), {
      target: { value: 'No hand trap line' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const subsections = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes;
    const child = subsections.find((subsection: { name: string }) => subsection.name === 'No hand trap line');
    expect(child.parentId).toBe(parentId);

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    if (!screen.queryByRole('button', { name: 'No hand trap line' })) {
      fireEvent.click(screen.getByRole('button', { name: '1-card combos' }));
    }
    expect(screen.getByRole('button', { name: 'No hand trap line' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Uncategorized' }));
    fireEvent.click(screen.getByTitle('Rename'));
    fireEvent.change(screen.getByLabelText('Combo subsection'), { target: { value: child.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].subsectionId).toBe(child.id);
  }, 10000);

  it('adds child subsections directly from the subsection tree', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      name: 'Hero Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Subsection' }));
    fireEvent.change(screen.getByPlaceholderText('Subsection name, e.g. 2-card combos...'), {
      target: { value: '1-card combos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const parentId = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes[0].id;

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByLabelText('Add subsection under 1-card combos'));
    fireEvent.change(screen.getByPlaceholderText('Subsection under 1-card combos...'), {
      target: { value: 'No hand trap line' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const subsections = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes;
    const child = subsections.find((subsection: { name: string }) => subsection.name === 'No hand trap line');
    expect(child.parentId).toBe(parentId);
    expect(screen.getByRole('button', { name: 'No hand trap line' })).toBeInTheDocument();
  }, 10000);

  it('renames and deletes subsections directly from the subsection tree', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      deck: 'Heroes',
      subsectionId: 'child',
      name: 'Hero Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));
    localStorage.setItem('ygo-combo-library-subsections', JSON.stringify({
      Heroes: [
        { id: 'parent', name: '1-card combos' },
        { id: 'child', name: 'No hand trap line', parentId: 'parent' },
      ],
    }));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByLabelText('Rename subsection 1-card combos'));
    fireEvent.change(screen.getByPlaceholderText('Rename 1-card combos...'), {
      target: { value: 'Starters' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: 'Starters' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes[0].name).toBe('Starters');

    if (!screen.queryByRole('button', { name: 'No hand trap line' })) {
      fireEvent.click(screen.getByRole('button', { name: 'Starters' }));
    }
    fireEvent.click(screen.getByLabelText('Delete subsection No hand trap line'));

    const subsections = JSON.parse(localStorage.getItem('ygo-combo-library-subsections')!).Heroes;
    expect(subsections.some((subsection: { id: string }) => subsection.id === 'child')).toBe(false);
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].subsectionId).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'No hand trap line' })).not.toBeInTheDocument();
  }, 10000);

  it('reorders combos within a deck by dragging compact rows', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'first', deck: 'Heroes', name: 'First Combo', text: 'Activate [A]', createdAt: 1 },
      { id: 'second', deck: 'Heroes', name: 'Second Combo', text: 'Activate [B]', createdAt: 2 },
    ]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByLabelText('Show compact list view'));

    const dragData = createComboDragData();
    fireEvent.dragStart(screen.getByRole('button', { name: 'Second Combo' }).closest('[draggable="true"]')!, {
      dataTransfer: dragData,
    });
    fireEvent.drop(screen.getByRole('button', { name: 'First Combo' }).closest('[draggable="true"]')!, {
      dataTransfer: dragData,
      clientY: 0,
    });

    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!).map((combo: { id: string }) => combo.id)).toEqual([
      'second',
      'first',
    ]);
  }, 10000);

  it('moves combos into child subsections by dropping on subsection rows', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'starter', deck: 'Heroes', subsectionId: 'parent', name: 'Starter Combo', text: 'Activate [A]', createdAt: 1 },
      { id: 'follow-up', deck: 'Heroes', name: 'Follow Up Combo', text: 'Activate [B]', createdAt: 2 },
    ]));
    localStorage.setItem('ygo-combo-library-subsections', JSON.stringify({
      Heroes: [
        { id: 'parent', name: 'Starters' },
        { id: 'child', name: 'No hand trap line', parentId: 'parent' },
      ],
    }));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('All Decks'), { target: { value: 'Heroes' } });
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Starters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Uncategorized' }));

    const dragData = createComboDragData();
    fireEvent.dragStart(screen.getByRole('button', { name: 'Follow Up Combo' }).closest('[draggable="true"]')!, {
      dataTransfer: dragData,
    });
    fireEvent.drop(screen.getByRole('button', { name: 'No hand trap line' }), {
      dataTransfer: dragData,
    });

    const movedCombo = JSON.parse(localStorage.getItem('ygo-combo-library')!)
      .find((combo: { id: string }) => combo.id === 'follow-up');
    expect(movedCombo.subsectionId).toBe('child');
  }, 20000);
});
