import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComboLibrary } from '@/components/ComboLibrary';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: (name: string) => ({
    data: name ? { name, imageUrl: `https://images.example.com/${encodeURIComponent(name)}.jpg` } : undefined,
    isLoading: false,
  }),
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
    localStorage.setItem('combo-library-view-v2', 'cards');
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-1',
      name: 'Compact Combo',
      text: 'Activate [Example Card]',
      createdAt: 1,
    }]));
  });

  it('defaults to a searchable thumbnail list with active selection and collapse controls', () => {
    localStorage.removeItem('combo-library-view-v2');
    const onLoad = vi.fn();
    const onCollapse = vi.fn();
    render(<ComboLibrary currentText="[Example Card]" activeComboId="combo-1" onLoad={onLoad} onCollapse={onCollapse} />);
    expect(screen.getByLabelText('Show thumbnail list view')).toHaveAttribute('aria-pressed', 'true');
    const row = screen.getByRole('button', { name: 'Compact Combo' });
    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(row.querySelector('img')).toBeInTheDocument();
    fireEvent.click(row);
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 'combo-1' }));
    fireEvent.change(screen.getByLabelText('Search combos'), { target: { value: 'missing' } });
    expect(screen.getByText('No combos match your search.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search combos'), { target: { value: 'Unassigned' } });
    expect(screen.getByRole('button', { name: 'Compact Combo' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Collapse combo library'));
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it('searches and selects decks through thumbnail rows', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'a', deck: 'Branded', name: 'Fusion Starter', text: '[Albaz]', createdAt: 1 },
      { id: 'b', deck: 'Heroes', name: 'Hero Starter', text: '[Stratos]', createdAt: 2 },
    ]));
    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search library decks'), { target: { value: 'brand' } });
    expect(screen.queryByRole('button', { name: 'Select deck Heroes' })).not.toBeInTheDocument();
    const deck = screen.getByRole('button', { name: 'Select deck Branded' });
    expect(deck.querySelector('img')).toBeInTheDocument();
    fireEvent.click(deck);
    expect(deck).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Fusion Starter')).toBeInTheDocument();
    expect(screen.queryByText('Hero Starter')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All Decks' }));
    expect(screen.getByText('Hero Starter')).toBeInTheDocument();
  });

  it('collapses deck search and persists a custom deck thumbnail', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      { id: 'a', deck: 'Branded', name: 'Starter', text: '[Albaz]', createdAt: 1 },
    ]));
    const view = render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Collapse deck search'));
    expect(screen.queryByLabelText('Search library decks')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expand deck search'));
    fireEvent.click(screen.getByLabelText('Change thumbnail for Branded'));
    fireEvent.change(screen.getByLabelText('Deck thumbnail card name'), { target: { value: 'Mirrorjade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save thumbnail' }));
    expect(screen.getByLabelText('Select deck Branded').querySelector('img')).toHaveAttribute('src', 'https://images.example.com/Mirrorjade.jpg');
    view.unmount();
    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    expect(screen.getByLabelText('Select deck Branded').querySelector('img')).toHaveAttribute('src', 'https://images.example.com/Mirrorjade.jpg');
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].thumbnailCardName).toBeUndefined();
    fireEvent.click(screen.getByLabelText('Change thumbnail for Branded'));
    fireEvent.change(screen.getByLabelText('Deck thumbnail card name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save thumbnail' }));
    expect(screen.getByLabelText('Select deck Branded').querySelector('img')).toHaveAttribute('src', 'https://images.example.com/Albaz.jpg');
  });

  it('creates and persists an empty deck from Deck Search', () => {
    localStorage.setItem('ygo-combo-library', '[]');
    const view = render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Add deck'));
    fireEvent.change(screen.getByLabelText('New deck name'), { target: { value: 'New Archetype' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create deck' }));
    expect(screen.getByLabelText('Select deck New Archetype')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No saved combos for this deck yet.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)).toEqual([]);
    view.unmount();
    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    expect(screen.getByLabelText('Select deck New Archetype')).toBeInTheDocument();
  });

  it('switches to a persistent compact list that loads combos by row', () => {
    const onLoad = vi.fn();
    const { unmount } = render(<ComboLibrary currentText="" onLoad={onLoad} />);

    expect(screen.getByLabelText('Show card view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show compact list view'));

    expect(screen.getByLabelText('Show compact list view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(localStorage.getItem('combo-library-view-v2')).toBe('compact');

    fireEvent.click(screen.getByRole('button', { name: 'Unassigned' }));
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
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getAllByText('Compact Combo Copy').length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText('Combo name...'), { target: { value: 'Renamed Compact Combo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getAllByText('Renamed Compact Combo').length).toBeGreaterThan(0);
    const storedCombos = JSON.parse(localStorage.getItem('ygo-combo-library')!);
    expect(storedCombos.find((combo: { id: string }) => combo.id === 'combo-1').thumbnailCardName).toBe('Existing Thumbnail');

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
    fireEvent.focus(screen.getByLabelText('Open notes for Notes Combo'));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('ygo-combo-library')!)[0].notes).toBe('Remember the anti-Nibiru line.');
      expect(screen.getByText('Remember the anti-Nibiru line.')).toBeInTheDocument();
      expect(screen.getByText('Remember the anti-Nibiru line.').closest('.glass-panel')).toBeNull();
    });

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    fireEvent.click(screen.getByLabelText('Open notes for Notes Combo'));

    expect(screen.getByLabelText('Combo notes')).toHaveValue('Remember the anti-Nibiru line.');
  });

  it('shows a combo preview button with editable plays-around and required cards', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-preview',
      deck: 'Branded',
      name: 'Preview Combo',
      text: 'Activate [Branded Fusion]',
      endboardSlots: {
        'monster-1': 'Mirrorjade the Iceblade Dragon',
        'spell-1': ['Branded in Red', 'Branded Retribution'],
        'hand-1': 'Mercourier',
      },
      playsAroundCards: ['Nibiru, the Primal Being'],
      requiredCards: ['Fallen of Albaz'],
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));

    const previewButton = screen.getByLabelText('Preview Preview Combo');
    expect(previewButton).toBeInTheDocument();
    expect(screen.queryByText('Endboard Preview')).not.toBeInTheDocument();

    fireEvent.mouseEnter(previewButton.parentElement!);
    expect(screen.getByText('Endboard Preview')).toBeInTheDocument();
    expect(screen.getByText('Plays Around')).toBeInTheDocument();
    expect(screen.getByText('Required Cards')).toBeInTheDocument();
    expect(screen.getByText('Nibiru, the Primal Being')).toBeInTheDocument();
    expect(screen.getByText('Fallen of Albaz')).toBeInTheDocument();
    expect(screen.getByAltText('Mirrorjade the Iceblade Dragon')).toBeInTheDocument();
    expect(screen.getByAltText('Branded Retribution')).toBeInTheDocument();
    expect(screen.getByAltText('Mercourier')).toBeInTheDocument();
    expect(screen.getByAltText('Nibiru, the Primal Being')).toBeInTheDocument();
    expect(screen.getByAltText('Fallen of Albaz')).toBeInTheDocument();
    expect(
      screen.getByAltText('Branded Retribution').compareDocumentPosition(screen.getByAltText('Mercourier')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Plays Around card for Preview Combo'), {
      target: { value: 'Droll & Lock Bird' },
    });
    fireEvent.click(screen.getByLabelText('Add plays around card for Preview Combo'));

    fireEvent.change(screen.getByLabelText('Required Cards card for Preview Combo'), {
      target: { value: 'Blazing Cartesia, the Virtuous' },
    });
    fireEvent.click(screen.getByLabelText('Add required cards card for Preview Combo'));

    const [storedCombo] = JSON.parse(localStorage.getItem('ygo-combo-library')!);
    expect(storedCombo.playsAroundCards).toEqual(['Nibiru, the Primal Being', 'Droll & Lock Bird']);
    expect(storedCombo.requiredCards).toEqual(['Fallen of Albaz', 'Blazing Cartesia, the Virtuous']);

    fireEvent.click(screen.getByLabelText('Expand preview for Preview Combo'));
    expect(screen.getByText('Preview for Preview Combo')).toBeInTheDocument();
  });

  it('shows live active endboard changes in the combo preview', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-preview-live',
      deck: 'Branded',
      name: 'Live Preview Combo',
      text: 'Activate [Branded Fusion]',
      endboardSlots: {
        'monster-1': 'Old Endboard Card',
      },
      createdAt: 1,
    }]));

    render(
      <ComboLibrary
        currentText="Activate [Branded Fusion]"
        currentEndboardSlots={{ 'monster-1': 'Fresh Endboard Card' }}
        activeComboId="combo-preview-live"
        onLoad={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    fireEvent.mouseEnter(screen.getByLabelText('Preview Live Preview Combo').parentElement!);

    expect(screen.getByAltText('Fresh Endboard Card')).toBeInTheDocument();
    expect(screen.queryByAltText('Old Endboard Card')).not.toBeInTheDocument();
  });

  it('uses the current route scope for active combo endboard previews', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-preview-route',
      deck: 'Branded',
      name: 'Route Preview Combo',
      text: '10.1a Activate [Route One]',
      endboardSlots: {
        'monster-1': 'Default Endboard Card',
      },
      createdAt: 1,
    }]));

    render(
      <ComboLibrary
        currentText="10.1a Activate [Route One]"
        currentEndboardSlots={{
          'route:10:1:monster-1': 'Route One Endboard Card',
          'route:10:2:monster-1': 'Route Two Endboard Card',
        }}
        currentEndboardSlotPrefix="route:10:2:"
        activeComboId="combo-preview-route"
        onLoad={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    fireEvent.mouseEnter(screen.getByLabelText('Preview Route Preview Combo').parentElement!);

    expect(screen.getByAltText('Route Two Endboard Card')).toBeInTheDocument();
    expect(screen.queryByAltText('Default Endboard Card')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Route One Endboard Card')).not.toBeInTheDocument();
  });

  it('derives the first preview from current branches and reacts to edits without opening Endboard', () => {
    const slots = {
      'monster-1': 'Default Card',
      'route:2:1:monster-1': 'Obsolete Route Card',
      'route:10:1:monster-1': 'First Route Card',
      'route:10:2:monster-1': 'Second Route Card',
    };
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'reactive-preview', deck: 'Branded', name: 'Reactive Combo',
      text: '10.1a Activate [First Route]\n10.2a Activate [Second Route]',
      endboardSlots: slots, createdAt: 1,
    }]));
    const { rerender } = render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));
    fireEvent.mouseEnter(screen.getByLabelText('Preview Reactive Combo').parentElement!);
    expect(screen.getByAltText('First Route Card')).toBeInTheDocument();
    expect(screen.queryByAltText('Default Card')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Obsolete Route Card')).not.toBeInTheDocument();

    const renderLive = (text: string, endboardSlots = slots) => rerender(
      <ComboLibrary currentText={text} currentEndboardSlots={endboardSlots}
        activeComboId="reactive-preview" onLoad={vi.fn()} />,
    );
    renderLive('10.2a Activate [Second Route]');
    expect(screen.getByAltText('Second Route Card')).toBeInTheDocument();
    expect(screen.queryByAltText('First Route Card')).not.toBeInTheDocument();
    renderLive('10.2a Activate [Second Route]', { ...slots, 'route:10:2:monster-1': 'Edited Card' });
    expect(screen.getByAltText('Edited Card')).toBeInTheDocument();
    expect(screen.queryByAltText('Second Route Card')).not.toBeInTheDocument();
    renderLive('10.3a Activate [New Route]');
    expect(screen.getByText('No saved endboard yet.')).toBeInTheDocument();
    renderLive('');
    expect(screen.getByAltText('Default Card')).toBeInTheDocument();
    rerender(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    expect(screen.getByAltText('First Route Card')).toBeInTheDocument();
  });

  it('keeps the hover preview inside the viewport near the page bottom', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 420 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    localStorage.setItem('ygo-combo-library', JSON.stringify([{
      id: 'combo-preview-position',
      deck: 'Branded',
      name: 'Position Preview Combo',
      text: 'Activate [Branded Fusion]',
      endboardSlots: {
        'monster-1': 'Mirrorjade the Iceblade Dragon',
      },
      createdAt: 1,
    }]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Show compact list view'));
    fireEvent.click(screen.getByRole('button', { name: 'Branded' }));

    const previewButton = screen.getByLabelText('Preview Position Preview Combo') as HTMLElement;
    const previewTrigger = previewButton.parentElement as HTMLElement;
    const previewRow = previewTrigger.closest('[data-combo-preview-row]') as HTMLElement;
    vi.spyOn(previewRow, 'getBoundingClientRect').mockReturnValue({
      x: 40,
      y: 330,
      top: 330,
      left: 40,
      right: 760,
      bottom: 380,
      width: 720,
      height: 50,
      toJSON: () => ({}),
    });

    fireEvent.mouseEnter(previewTrigger);

    const hoverWindow = screen.getByText('Endboard Preview').closest('.fixed') as HTMLElement;
    expect(hoverWindow).toBeInTheDocument();
    expect(hoverWindow.style.top).toBe('');
    expect(hoverWindow.style.transform).toBe('');
    expect(Number.parseFloat(hoverWindow.style.bottom)).toBe(108);
    expect(420 - Number.parseFloat(hoverWindow.style.bottom)).toBe(312);
    expect(Number.parseFloat(hoverWindow.style.maxHeight)).toBe(300);
    expect(Number.parseFloat(hoverWindow.style.left)).toBe(40);
    expect(Number.parseFloat(hoverWindow.style.width)).toBe(720);
  });

  it('filters search results by combo title and deck name', () => {
    localStorage.setItem('ygo-combo-library', JSON.stringify([
      {
        id: 'title-match',
        deck: 'Branded',
        name: 'Aluber Starter',
        text: 'Activate [Branded Fusion]',
        createdAt: 1,
      },
      {
        id: 'content-match',
        deck: 'Branded',
        name: 'Fusion Line',
        text: 'Normal Summon [Aluber the Jester of Despia]',
        createdAt: 2,
      },
      {
        id: 'deck-match',
        deck: 'Aluber Deck',
        name: 'Different Starter',
        text: 'Activate [Opening]',
        createdAt: 3,
      },
    ]));

    render(<ComboLibrary currentText="" onLoad={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search combos'), {
      target: { value: 'aluber' },
    });

    expect(screen.getByText('Aluber Starter')).toBeInTheDocument();
    expect(screen.queryByText('Fusion Line')).not.toBeInTheDocument();
    expect(screen.getByText('Different Starter')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Select deck Branded' }));

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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Select deck Heroes' }));
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
