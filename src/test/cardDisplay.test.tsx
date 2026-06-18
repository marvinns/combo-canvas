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
