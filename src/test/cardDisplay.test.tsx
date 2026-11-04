import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDisplay } from '@/components/CardDisplay';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: (name: string) => ({
    data: {
      imageUrl: `https://images.example.com/${name}.png`,
      name,
      archetype: 'Test',
    },
    isLoading: false,
  }),
  useRelatedCards: () => ({
    data: {
      archetype: 'Test',
      cards: [
        {
          id: 1,
          name: 'Related Test Card',
          imageUrl: 'https://images.example.com/related-test-card.png',
          thumbnailUrl: 'https://images.example.com/related-test-card-small.png',
        },
      ],
    },
    isLoading: false,
  }),
}));

describe('CardDisplay fullscreen preview', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reserves a fixed top badge rail so cards remain vertically aligned', () => {
    const { container } = render(
      <CardDisplay name="Test Card" customTag="draw 1" statuses={['set']} />,
    );

    expect(container.querySelector('[data-card-top-badge-rail]')).toHaveClass('h-16', 'shrink-0', 'justify-end');
  });

  it('renders a custom tag above the card', () => {
    render(<CardDisplay name="Test Card" customTag="lvl 4" />);

    expect(screen.getByText('lvl 4')).toBeInTheDocument();
  });

  it('renders a normal summon status badge above the card', () => {
    render(<CardDisplay name="Test Card" statuses={['normal-summon']} />);

    expect(screen.getByText('NS')).toBeInTheDocument();
  });

  it('opens the fullscreen preview on double click', () => {
    render(<CardDisplay name="Test Card" />);

    const trigger = screen.getByRole('button', {
      name: 'Open full screen view for Test Card with a double click',
    });

    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.doubleClick(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByAltText('Test Card').length).toBeGreaterThan(0);
  });

  it('opens related cards from the fullscreen preview', () => {
    render(<CardDisplay name="Test Card" />);

    fireEvent.doubleClick(screen.getByRole('button', {
      name: 'Open full screen view for Test Card with a double click',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Show related cards' }));

    expect(screen.getByText('Related cards')).toBeInTheDocument();
    expect(screen.getByText('Related Test Card')).toBeInTheDocument();
  });

  it('edits card instance info and shows it as a HUD callout on hover', () => {
    const handleCardInfoChange = vi.fn();
    render(
      <CardDisplay
        name="Test Card"
        cardInfo="Hold until chain link two."
        onCardInfoChange={handleCardInfoChange}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Open full screen view for Test Card with a double click',
    });

    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Hold until chain link two.')).toBeInTheDocument();

    fireEvent.doubleClick(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Show card info' }));
    fireEvent.change(screen.getByLabelText('Additional information for Test Card'), {
      target: { value: 'New instance-only reminder.' },
    });

    expect(handleCardInfoChange).toHaveBeenLastCalledWith('New instance-only reminder.');
  });

  it('cycles pipe-separated card names in one slot every two seconds with glare', () => {
    vi.useFakeTimers();
    const { container } = render(<CardDisplay name="Card 1 | Card 2 | Card 3" />);

    expect(screen.getByAltText('Card 1')).toBeInTheDocument();
    expect(container.querySelector('[data-card-slot-glare]')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByAltText('Card 2')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByAltText('Card 1')).toBeInTheDocument();
  });

  it('preserves slashes that are part of a card name', () => {
    const { container } = render(<CardDisplay name="D/D Gryphon" />);

    expect(screen.getByAltText('D/D Gryphon')).toBeInTheDocument();
    expect(container.querySelector('[data-card-slot-glare]')).not.toBeInTheDocument();
  });
});


describe('scale card border glow', () => {
  it('keeps the glow in the full-screen scale preview but not on unrelated cards', () => {
    render(<CardDisplay name="Scale Card" actionType="scale" />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Open full screen view for Scale Card with a double click' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('[data-scale-border-glow]')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show related cards'));
    fireEvent.click(screen.getByRole('button', { name: /Related Test Card/ }));
    expect(dialog.querySelector('[data-scale-border-glow]')).toBeNull();
  });

  it('adds a separate border layer for scales and removes it when the role changes', () => {
    const { container, rerender } = render(<CardDisplay name="Scale Card" actionType="scale" />);
    expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(1);
    expect(container.querySelector('[data-scale-border-glow]')).toHaveAttribute('aria-hidden', 'true');
    rerender(<CardDisplay name="Scale Card" actionType="summon" />);
    expect(container.querySelector('[data-scale-border-glow]')).toBeNull();
    rerender(<CardDisplay name="Scale Card" actionType="activate" />);
    expect(container.querySelector('[data-scale-border-glow]')).toBeNull();
    rerender(<CardDisplay name="Scale Card" actionType="scale" compact />);
    expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(1);
  });
});


describe('Special Summon zone badges', () => {
  it.each(['gy', 'banished'] as const)('hides the old %s zone after Special Summoning', (zone) => {
    render(<CardDisplay name="Summoned Card" zone={zone} statuses={['special-summon']} />);
    expect(screen.getByText('SS')).toBeInTheDocument();
    expect(screen.queryByText(/^(GY|Banished)$/)).not.toBeInTheDocument();
  });

  it.each(['gy', 'banished'] as const)('keeps the %s zone on a card activating there', (zone) => {
    render(<CardDisplay name="Activating Card" zone={zone} isActivated />);
    expect(screen.getByText(zone === 'gy' ? 'GY' : 'Banished')).toBeInTheDocument();
  });
});
