import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Index from '@/pages/Index';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: () => ({ data: null, isLoading: false }),
  useRelatedCards: () => ({ data: { cards: [] }, isLoading: false }),
}));

vi.mock('@/components/SideRays', () => ({
  SideRays: () => null,
}));

describe('Index branching breakdown', () => {
  it('reveals a selected route and then reconverges into one shared step', () => {
    const { container } = render(<Index />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

    editor.innerHTML = [
      '10. Normal Summon [Starter]',
      '11. Set [Route One], [Route Two] and [Route Three]',
      '11.1a Activate [Route One]',
      '11.2a Activate [Route Two]',
      '11.2b Search [Route Two Follow-up] from deck',
      '11.3a Activate [Route Three]',
      '11.3b Search [Route Three Follow-up] from deck',
      '11.3c Set [Route Three End]',
      '12. Activate [Shared Merge]',
    ].join('<br>');
    fireEvent.input(editor);
    fireEvent.click(screen.getByText('Visualize Combo'));
    expect(container.querySelector('.border-glow-card')).toHaveClass('h-[500px]', 'w-full');
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(screen.getByText('Step 11')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show route 1 from step 11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show route 2 from step 11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show route 3 from step 11' })).toBeInTheDocument();
    expect(screen.getByText('Step 11 / 12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show route 2 from step 11' }));
    expect(screen.getByText('Step 11.2a')).toBeInTheDocument();
    expect(screen.getByText('Step 11.2a / 12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Step 11.2b')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Step 12')).toBeInTheDocument();
    expect(screen.getAllByText('Shared Merge').length).toBeGreaterThan(0);
  }, 15000);

  it('keeps a separate endboard layout for each route', () => {
    const { container } = render(<Index />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

    editor.innerHTML = [
      '10. Set [Route One] and [Route Two]',
      '10.1a Activate [Route One]',
      '10.2a Activate [Route Two]',
      'Activate [Shared Merge]',
    ].join('<br>');
    fireEvent.input(editor);
    fireEvent.click(screen.getByText('Visualize Combo'));
    fireEvent.click(screen.getByRole('button', { name: 'Show endboard builder' }));

    expect(screen.getByRole('button', { name: 'Show route 1 from step 10' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(16);

    fireEvent.click(screen.getAllByLabelText('Add card to endboard slot')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Route One Known card' }));
    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(15);

    fireEvent.click(screen.getByRole('button', { name: 'Show route 2 from step 10' }));
    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(16);

    fireEvent.click(screen.getByRole('button', { name: 'Show route 1 from step 10' }));
    expect(screen.getAllByLabelText('Add card to endboard slot')).toHaveLength(15);
  }, 15000);
});
