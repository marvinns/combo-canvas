import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComboStepVisual } from '@/components/ComboStepVisual';
import { parseCombo } from '@/lib/comboParser';

vi.mock('@/hooks/useCardImage', () => ({
  useCardImage: () => ({ data: null, isLoading: false }),
  useRelatedCards: () => ({ data: { cards: [] }, isLoading: false }),
}));

describe('ComboStepVisual send-to-GY stack origin', () => {
  it('does not label the destination as the origin below the arrow', () => {
    const [action] = parseCombo('Activate [Snake-Eye Ash] to send [snake-eyes diabellstar] and [Snake-Eye Ash] to the gy to ss [Snake-Eye Oak].');
    render(<ComboStepVisual action={action} stepNumber={30} />);
    expect(screen.queryByText('From GY')).not.toBeInTheDocument();
    expect(screen.getAllByText('In GY').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('Bring snake-eyes diabellstar to front'));
    expect(screen.queryByText('From GY')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full screen view for Snake-Eye Oak with a double click' })).toBeInTheDocument();
  });
});

describe('ComboStepVisual Continuous Spell layout', () => {
  it('renders the effect above the connector and labels the step and receiving card', () => {
    const [action] = parseCombo('Activate [divine temple] and put [snake-eyes diabellstar] in the continuous spell and trap zone.');
    const { container } = render(<ComboStepVisual action={action} stepNumber={29} />);
    const source = screen.getByRole('button', { name: 'Open full screen view for divine temple with a double click' });
    const target = screen.getByRole('button', { name: 'Open full screen view for snake-eyes diabellstar with a double click' });
    const labels = screen.getAllByText('Continuous Spell');
    expect(labels).toHaveLength(2);
    expect(screen.getByText('Step 29').parentElement).toContainElement(labels[0]);
    expect(labels[1].closest('[data-card-top-badge-rail]')).not.toBeNull();
    expect(labels[1].compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const arrow = container.querySelector('lord-icon[src="https://cdn.lordicon.com/jarmuava.json"]');
    expect(arrow).not.toBeNull();
    expect(source.compareDocumentPosition(arrow!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(arrow!.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(arrow!.parentElement!.parentElement!.firstElementChild!.querySelector('svg')).not.toBeNull();
  });
});

describe('ComboStepVisual Equip layout', () => {
  it.each([
    'Activate [Union Driver] to equip [A-Assault Core]',
    'Equip [A-Assault Core] to [Union Driver]',
  ])('renders receiver, Equip icon, and equipped card for %s', (text) => {
    const [action] = parseCombo(text);
    render(<ComboStepVisual action={action} stepNumber={1} />);
    const receiver = screen.getByRole('button', { name: 'Open full screen view for Union Driver with a double click' });
    const equipped = screen.getByRole('button', { name: 'Open full screen view for A-Assault Core with a double click' });
    expect(screen.getAllByRole('img', { name: 'Equip' })).toHaveLength(1);
    const icon = screen.getAllByRole('img', { name: 'Equip' }).find((candidate) =>
      Boolean(receiver.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      Boolean(candidate.compareDocumentPosition(equipped) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    expect(icon).toBeDefined();
    expect(screen.getByText('Equip')).toBeInTheDocument();
  });
});

describe('ComboStepVisual activate fusion layout', () => {
  it('renders activate source, fusion material, and fusion target for bare-name CL activate fusion lines', () => {
    const [action] = parseCombo('CL1 Activate the hallowed Azamina to fusion summon Azamina ilia using Sinful spoils of the white forest.');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getAllByText('the hallowed Azamina').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sinful spoils of the white forest').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Azamina ilia').length).toBeGreaterThan(0);
    expect(screen.getByText('Chain Link 1')).toBeInTheDocument();
  });
});

describe('ComboStepVisual simple activate layout', () => {
  it('keeps the card info editor open when card note state updates', () => {
    const [action] = parseCombo('Normal Summon [Test Card]');
    const handleCardNoteChange = vi.fn();
    const { rerender } = render(
      <ComboStepVisual
        action={action}
        stepNumber={1}
        cardNoteIdPrefix="step:0"
        cardNotes={{}}
        onCardNoteChange={handleCardNoteChange}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('button', {
      name: 'Open full screen view for Test Card with a double click',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Show card info' }));
    fireEvent.change(screen.getByLabelText('Additional information for Test Card'), {
      target: { value: 'A' },
    });

    rerender(
      <ComboStepVisual
        action={action}
        stepNumber={1}
        cardNoteIdPrefix="step:0"
        cardNotes={{ 'step:0:card:0': 'A' }}
        onCardNoteChange={handleCardNoteChange}
      />,
    );

    expect(screen.getByLabelText('Additional information for Test Card')).toHaveValue('A');
  });

  it('renders phase and chain-link tags together', () => {
    const [action] = parseCombo('EP CL1 Activate [Lubellion] to discard [Blazing Cartesia]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getByText('End Phase')).toBeInTheDocument();
    expect(screen.getByText('Chain Link 1')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
  });

  it('renders a pendulum summon symbol before pendulum summoned cards', () => {
    const [action] = parseCombo('Pendulum summon [D/D Gryphon] and [D/D Orthros]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const pendulumSymbol = screen.getByLabelText('Pendulum Summon symbol');
    const gryphon = screen.getAllByText('D/D Gryphon').find((node) => node.tagName === 'SPAN');

    expect(pendulumSymbol).toBeInTheDocument();
    expect(gryphon).toBeDefined();
    expect(pendulumSymbol.compareDocumentPosition(gryphon as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a set symbol before multiple set target cards', () => {
    const [action] = parseCombo('Set [Eternal Darkness] and [D/D/D Headhunt]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const setSymbol = screen.getByLabelText('Set symbol');
    const eternalDarkness = screen.getAllByText('Eternal Darkness').find((node) => node.tagName === 'SPAN');

    expect(setSymbol).toBeInTheDocument();
    expect(eternalDarkness).toBeDefined();
    expect(setSymbol.compareDocumentPosition(eternalDarkness as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders activate-to-scale targets inline after the activating card', () => {
    const [action] = parseCombo('CL2 Activate [Gilgamesh] to scale [Orthros] and [Oblivion King abyss]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const gilgamesh = screen.getAllByText('Gilgamesh').find((node) => node.tagName === 'SPAN');
    const orthros = screen.getAllByText('Orthros').find((node) => node.tagName === 'SPAN');
    const oblivion = screen.getAllByText('Oblivion King abyss').find((node) => node.tagName === 'SPAN');

    expect(gilgamesh).toBeDefined();
    expect(orthros).toBeDefined();
    expect(oblivion).toBeDefined();
    expect(screen.getByText('Chain Link 2')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(gilgamesh?.compareDocumentPosition(orthros as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(orthros?.compareDocumentPosition(oblivion as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders multiple activate target cards', () => {
    const [action] = parseCombo('Activate [Secreterion] to target [Dracotail Arthalion] and [Dracotail Phryxul] in the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const secreterion = screen.getAllByText('Secreterion').find((node) => node.tagName === 'SPAN');
    const arthalion = screen.getAllByText('Dracotail Arthalion').find((node) => node.tagName === 'SPAN');
    const phryxul = screen.getAllByText('Dracotail Phryxul').find((node) => node.tagName === 'SPAN');

    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(secreterion).toBeDefined();
    expect(arthalion).toBeDefined();
    expect(phryxul).toBeDefined();
    expect(secreterion?.compareDocumentPosition(arthalion as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(arthalion?.compareDocumentPosition(phryxul as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders scale then activate to special summon with the summoned target', () => {
    const [action] = parseCombo('Scale [Lunalight Tiger] and activate it to ss [Kaleido Chick] from the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const tiger = screen.getAllByText('Lunalight Tiger').find((node) => node.tagName === 'SPAN');
    const kaleido = screen.getAllByText('Kaleido Chick').find((node) => node.tagName === 'SPAN');

    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(screen.getByText('Special Summon')).toBeInTheDocument();
    expect(tiger).toBeDefined();
    expect(kaleido).toBeDefined();
    expect(tiger?.compareDocumentPosition(kaleido as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders normal summon and activate it to special summon as a two-card step', () => {
    const [action] = parseCombo('ns [Fallen of the White] and activate it to ss [Incredible Ecclesia]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const fallen = screen.getAllByText('Fallen of the White').find((node) => node.tagName === 'SPAN');
    const ecclesia = screen.getAllByText('Incredible Ecclesia').find((node) => node.tagName === 'SPAN');

    expect(screen.getByText('Normal Summon')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Special Summon')).toBeInTheDocument();
    expect(fallen).toBeDefined();
    expect(ecclesia).toBeDefined();
    expect(fallen?.compareDocumentPosition(ecclesia as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders normal summon and activate it to banish from deck as a two-card step', () => {
    const [action] = parseCombo('Ns [Cocatorium] and activate it to banish [Mercourier] from the deck.');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const cocatorium = screen.getAllByText('Cocatorium').find((node) => node.tagName === 'SPAN');
    const mercourier = screen.getAllByText('Mercourier').find((node) => node.tagName === 'SPAN');

    expect(screen.getByText('Normal Summon')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Banish')).toBeInTheDocument();
    expect(cocatorium).toBeDefined();
    expect(mercourier).toBeDefined();
    expect(cocatorium?.compareDocumentPosition(mercourier as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cocatorium?.parentElement?.parentElement).toHaveTextContent('NS');
    expect(mercourier?.parentElement).not.toHaveTextContent('NS');
  });

  it('renders normal summon into tribute itself and special summon as a three-card step', () => {
    const [action] = parseCombo('Ns [Incredible Ecclesia, the Virtuous] and activate it to tribute itself to ss [Fallen of the White Dragon] from the deck');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const ecclesiaCards = screen.getAllByText('Incredible Ecclesia, the Virtuous')
      .filter((node) => node.tagName === 'SPAN')
      .map((node) => node.parentElement?.parentElement)
      .filter((node): node is HTMLElement => Boolean(node));
    const fallen = screen.getAllByText('Fallen of the White Dragon').find((node) => node.tagName === 'SPAN');

    expect(screen.getByText('Normal Summon')).toBeInTheDocument();
    expect(screen.getByText('Tribute')).toBeInTheDocument();
    expect(screen.getByText('Special Summon')).toBeInTheDocument();
    expect(ecclesiaCards.some((card) => card.textContent?.includes('NS'))).toBe(true);
    expect(ecclesiaCards.some((card) => card.textContent?.includes('Tributed'))).toBe(true);
    expect(fallen?.parentElement?.parentElement).toHaveTextContent('SS');
  });

  it('renders a gy activate into a gy special summon as a two-card step', () => {
    const [action] = parseCombo('Activate [sigma plus] in the gy to ss [Epsilon] from the the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const sigmaPlus = screen.getAllByText('sigma plus').find((node) => node.tagName === 'SPAN')?.parentElement;
    const epsilon = screen.getAllByText('Epsilon').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Special Summon')).toBeInTheDocument();
    expect(sigmaPlus).not.toBeNull();
    expect(epsilon).not.toBeNull();
    expect(within(sigmaPlus as HTMLElement).getByText('GY')).toBeInTheDocument();
    expect(within(epsilon as HTMLElement).queryByText('GY')).not.toBeInTheDocument();
    expect(screen.getByText('From GY')).toBeInTheDocument();
    expect(within(epsilon as HTMLElement).getByText('SS')).toBeInTheDocument();
  });

  it('renders a gy activate into adding itself to hand as a two-card step', () => {
    const [action] = parseCombo('Activate [linear magnum plus] in the gy to add itself to the hand');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const cards = screen.getAllByText('linear magnum plus')
      .filter((node) => node.tagName === 'SPAN')
      .map((node) => node.parentElement)
      .filter((node): node is HTMLElement => Boolean(node));

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(cards).toHaveLength(2);
    expect(cards.some((card) => within(card).queryByText('GY'))).toBe(true);
    expect(cards.some((card) => within(card).queryByText('Hand'))).toBe(true);
  });

  it('renders custom tags written after or before card references', () => {
    const [suffixAction] = parseCombo('Activate [Card A](lvl 4) to add [Card B] to hand.');
    const [prefixAction] = parseCombo('Activate (lvl3)[Card A] to add [Card B] to hand.');

    const { rerender } = render(<ComboStepVisual action={suffixAction} stepNumber={1} />);
    expect(screen.getByText('lvl 4')).toBeInTheDocument();
    expect(screen.getAllByText('Card A').length).toBeGreaterThan(0);

    rerender(<ComboStepVisual action={prefixAction} stepNumber={1} />);
    expect(screen.getByText('lvl3')).toBeInTheDocument();
    expect(screen.getAllByText('Card A').length).toBeGreaterThan(0);
  });

  it('renders quoted custom step tags alongside action labels', () => {
    const [action] = parseCombo('Activate [Card A] to add [Card B] to hand "floodgate".');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getByText('floodgate')).toBeInTheDocument();
  });

  it('renders activate source then destroy target for bare-name CL activate destroy lines', () => {
    const [action] = parseCombo('CL2 Activate Moa to destroy Mu rcielago');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getAllByText('Moa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mu rcielago').length).toBeGreaterThan(0);
    expect(screen.getByText('Chain Link 2')).toBeInTheDocument();
    expect(screen.getByText('Destroy')).toBeInTheDocument();
  });

  it('renders activate discard itself then add to hand lines', () => {
    const [action] = parseCombo('Activate [Lunalight Black Sheep] to discard itself and add [Polymerization] to the hand');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getAllByText('Lunalight Black Sheep').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Polymerization').length).toBeGreaterThan(0);

    const discardedBlackSheepCard = screen
      .getAllByText('Lunalight Black Sheep')
      .map((node) => node.closest('.flex.shrink-0.flex-col.items-center'))
      .find((node): node is HTMLElement => Boolean(node && within(node as HTMLElement).queryByText('Discarded')));
    const polymerizationCard = screen
      .getAllByText('Polymerization')
      .map((node) => node.closest('.flex.shrink-0.flex-col.items-center'))
      .find((node): node is HTMLElement => Boolean(node && within(node as HTMLElement).queryByText('Hand')));

    expect(discardedBlackSheepCard).toBeTruthy();
    expect(within(discardedBlackSheepCard).getByText('GY')).toBeInTheDocument();
    expect(polymerizationCard).toBeTruthy();
    expect(within(polymerizationCard).queryByText('Discarded')).not.toBeInTheDocument();
  });

  it('renders activate add then discard lines without explicit to-hand wording', () => {
    const [action] = parseCombo('Activate [Gold Leo] to add [Kaleido Chick] and discard [card]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getAllByText('Gold Leo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kaleido Chick').length).toBeGreaterThan(0);

    const discardedCard = screen
      .getAllByText('card')
      .map((node) => node.closest('.flex.shrink-0.flex-col.items-center'))
      .find((node): node is HTMLElement => Boolean(node && within(node as HTMLElement).queryByText('Discarded')));

    expect(discardedCard).toBeTruthy();
    expect(within(discardedCard as HTMLElement).getByText('GY')).toBeInTheDocument();
  });

  it('renders simple discard and add wording as a two-card step', () => {
    const [action] = parseCombo('Discard [card] and add [Fallen of the White] to the hand.');

    const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);

    const discardedCard = screen
      .getAllByText('card')
      .map((node) => node.closest('.flex.shrink-0.flex-col.items-center'))
      .find((node): node is HTMLElement => Boolean(node && within(node as HTMLElement).queryByText('Discarded')));
    const addedCard = screen
      .getAllByText('Fallen of the White')
      .map((node) => node.closest('.flex.shrink-0.flex-col.items-center'))
      .find((node): node is HTMLElement => Boolean(node && within(node as HTMLElement).queryByText('Hand')));

    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(discardedCard).toBeTruthy();
    expect(within(discardedCard as HTMLElement).getByText('GY')).toBeInTheDocument();
    expect(addedCard).toBeTruthy();

    const searchArrow = Array.from(container.querySelectorAll('.flex.flex-col.items-center.gap-2.self-center'))
      .find((node) => node.querySelector('.text-blue-400'));
    expect(searchArrow).toBeTruthy();
    expect(searchArrow?.querySelector('lord-icon')).toBeInTheDocument();
  });

  it('renders activate discard then set as a three-card step', () => {
    const [action] = parseCombo('Activate [Knightmare Gryphon] to discard [card], then set [magnet bonding]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const discardedCard = screen.getAllByText('card').find((node) => node.tagName === 'SPAN')?.parentElement;
    const setCard = screen.getAllByText('magnet bonding').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getAllByText('Set').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Knightmare Gryphon').length).toBeGreaterThan(0);
    expect(within(discardedCard as HTMLElement).getByText('Discarded')).toBeInTheDocument();
    expect(within(discardedCard as HTMLElement).getByText('GY')).toBeInTheDocument();
    expect(within(setCard as HTMLElement).getByText('Set')).toBeInTheDocument();
  });

  it('renders end phase activate send then destroy as a tagged three-card step', () => {
    const [action] = parseCombo('EP Activate (First Effect)[The Fallen & The Virtuous] to send [Albion] to the gy and destroy [Incredible Ecclesia]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const albion = screen.getAllByText('Albion').find((node) => node.tagName === 'SPAN')?.parentElement;
    const ecclesia = screen.getAllByText('Incredible Ecclesia').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByText('End Phase')).toBeInTheDocument();
    expect(screen.getByText('First Effect')).toBeInTheDocument();
    expect(screen.getByText('Send to GY')).toBeInTheDocument();
    expect(screen.getByText('Destroy')).toBeInTheDocument();
    expect(within(albion as HTMLElement).getByText('In GY')).toBeInTheDocument();
    expect(within(albion as HTMLElement).getByText('GY')).toBeInTheDocument();
    expect(within(ecclesia as HTMLElement).getByText('Destroyed')).toBeInTheDocument();
  });

  it('renders activate add then return as a three-card step', () => {
    const [action] = parseCombo('Activate [Springans Kitt] to add [Retribution] to the hand and return [card] to the deck');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const retribution = screen.getAllByText('Retribution').find((node) => node.tagName === 'SPAN')?.parentElement;
    const returnedCard = screen.getAllByText('card').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    expect(screen.getAllByText('Springans Kitt').length).toBeGreaterThan(0);
    expect(within(retribution as HTMLElement).getByText('Hand')).toBeInTheDocument();
    expect(within(returnedCard as HTMLElement).getByText('Returned')).toBeInTheDocument();
    expect(within(returnedCard as HTMLElement).getByText('Deck')).toBeInTheDocument();
  });

  it('renders end phase target in gy then add to hand as a three-card step', () => {
    const [action] = parseCombo('EP Activate [Branded in Red] to target [Fallen of the White] in the gy and add [Fallen of the White] to the hand');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const fallenCards = screen.getAllByText('Fallen of the White')
      .filter((node) => node.tagName === 'SPAN')
      .map((node) => node.parentElement)
      .filter((node): node is HTMLElement => Boolean(node));

    expect(screen.getByText('End Phase')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getAllByText('Branded in Red').length).toBeGreaterThan(0);
    expect(fallenCards.some((card) => within(card).queryByText('GY'))).toBe(true);
    expect(fallenCards.some((card) => within(card).queryByText('Hand'))).toBe(true);
  });

  it('renders an arbitrary pair of activate effects as a three-card step', () => {
    const [action] = parseCombo('Activate [Card A] to negate [Card B] and reveal [Card C]');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const negatedCard = screen.getAllByText('Card B').find((node) => node.tagName === 'SPAN')?.parentElement;
    const revealedCard = screen.getAllByText('Card C').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByText('Negate')).toBeInTheDocument();
    expect(screen.getByText('Reveal')).toBeInTheDocument();
    expect(within(negatedCard as HTMLElement).getByText('Negated')).toBeInTheDocument();
    expect(within(revealedCard as HTMLElement).getByText('Revealed')).toBeInTheDocument();
  });

  it('shows the sent card origin for activate send-from-hand then special summon lines', () => {
    const [action] = parseCombo('Activate [elfnotes: Rhapsodia of Madness] to send [elfnote regina] from the hand to the gy to ss [elfnote power patron] from the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const reginaCard = screen.getAllByText('elfnote regina').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(reginaCard).not.toBeNull();
    expect(within(reginaCard as HTMLElement).getByText('From Hand')).toBeInTheDocument();
    expect(within(reginaCard as HTMLElement).queryByText('In GY')).not.toBeInTheDocument();
  });
});

describe('ComboStepVisual banish material summon layout', () => {
  it('shows the banish effect without adding a banished badge to the summoned monster', () => {
    const [action] = parseCombo('ss [diabellstar vengeance] by banishing [Filia diabell] and [curse of diabell] from the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getAllByText('diabellstar vengeance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Filia diabell').length).toBeGreaterThan(0);
    expect(screen.getAllByText('curse of diabell').length).toBeGreaterThan(0);
    expect(screen.getByText('Banish')).toBeInTheDocument();
    expect(screen.queryByText('Banished')).not.toBeInTheDocument();
  });

  it('uses the cascade view for three or more banished summon materials', () => {
    const [action] = parseCombo('ss (Colink)[Block Dragon] by banishing [omega plus], [linear] and [Epsilon] from the gy.');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    expect(screen.getByLabelText('Bring omega plus to front')).toBeInTheDocument();
    expect(screen.getByLabelText('Bring linear to front')).toBeInTheDocument();
    expect(screen.getByLabelText('Bring Epsilon to front')).toBeInTheDocument();
    expect(screen.getByText('From GY')).toBeInTheDocument();
  });

  it('keeps the SS badge on the summoned card for special summon then add-to-hand lines', () => {
    const [action] = parseCombo('ss [elzette], activate its effect to add [silvy] to the hand.');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const elzetteCard = screen.getAllByText('elzette').find((node) => node.tagName === 'SPAN')?.parentElement;
    const silvyCard = screen.getAllByText('silvy').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(elzetteCard).not.toBeNull();
    expect(silvyCard).not.toBeNull();
    expect(within(elzetteCard as HTMLElement).getByText('SS')).toBeInTheDocument();
    expect(within(silvyCard as HTMLElement).queryByText('SS')).not.toBeInTheDocument();
  });

  it('shows the SS badge on the summoned card for send-to-gy material summons', () => {
    const [action] = parseCombo('ss [Diabellstar] by sending [silvy] to the gy');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const diabellstarCard = screen.getAllByText('Diabellstar').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(diabellstarCard).not.toBeNull();
    expect(within(diabellstarCard as HTMLElement).getByText('SS')).toBeInTheDocument();
    expect(within(diabellstarCard as HTMLElement).queryByText('In GY')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Leading material effect icons')).toBeInTheDocument();
  });

  it('keeps tribute summon targets out of the tributed material stack', () => {
    const [action] = parseCombo('Tribute summon [Alba-Lenatus] by tributing [Dracotail Arthalion], [Fallen of the White] and [Fallen of Albaz].');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const albaCard = screen.getAllByText('Alba-Lenatus').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(screen.getByLabelText('Bring Dracotail Arthalion to front')).toBeInTheDocument();
    expect(screen.getByLabelText('Bring Fallen of the White to front')).toBeInTheDocument();
    expect(screen.getByLabelText('Bring Fallen of Albaz to front')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bring Alba-Lenatus to front')).not.toBeInTheDocument();
    expect(albaCard).not.toBeNull();
    expect(within(albaCard as HTMLElement).getByText('NS')).toBeInTheDocument();
  });

  it('keeps the banished badge on the post-arrow target card in banish-then-summon lines', () => {
    const [action] = parseCombo('Activate [Fusion Destiny] to banish [Destiny HERO - Malicious] and special summon [Destiny HERO - Denier].');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const maliciousCard = screen.getAllByText('Destiny HERO - Malicious').find((node) => node.tagName === 'SPAN')?.parentElement;
    const denierCard = screen.getAllByText('Destiny HERO - Denier').find((node) => node.tagName === 'SPAN')?.parentElement;

    expect(maliciousCard).not.toBeNull();
    expect(denierCard).not.toBeNull();
    expect(within(maliciousCard as HTMLElement).getByText('Banished')).toBeInTheDocument();
    expect(within(denierCard as HTMLElement).getByText('SS')).toBeInTheDocument();
    expect(within(denierCard as HTMLElement).queryByText('Banished')).not.toBeInTheDocument();
  });

  it('does not transfer the banished badge onto the summoned copy in self-banish summon lines', () => {
    const [action] = parseCombo('Activate [destiny hero - malicious] in the gy to banish itself and ss [destiny hero - malicious] from the deck.');

    render(<ComboStepVisual action={action} stepNumber={1} />);

    const maliciousCards = screen.getAllByText('destiny hero - malicious')
      .filter((node) => node.tagName === 'SPAN')
      .map((node) => node.parentElement)
      .filter((node): node is HTMLElement => Boolean(node));
    const banishedCard = maliciousCards.find((card) => within(card).queryByText('Banished'));
    const summonedCard = maliciousCards.find((card) => within(card).queryByText('SS'));

    expect(banishedCard).toBeDefined();
    expect(summonedCard).toBeDefined();
    expect(within(banishedCard as HTMLElement).getByText('Banished')).toBeInTheDocument();
    expect(within(summonedCard as HTMLElement).getByText('SS')).toBeInTheDocument();
    expect(within(summonedCard as HTMLElement).queryByText('Banished')).not.toBeInTheDocument();
  });
});


describe('Send to Extra Deck connector', () => {
  it('shows the animated Extra Deck icon above the arrow', () => {
    const [action] = parseCombo('Activate [Pendulum Treasure] to send [Vidolium] to the extra deck');
    const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
    const icon = screen.getByRole('img', { name: 'Send to Extra Deck' });
    const arrow = container.querySelector('lord-icon[src="https://cdn.lordicon.com/jarmuava.json"]');
    expect(icon.querySelector('svg')).toBeInTheDocument();
    expect(icon.parentElement?.parentElement).toContainElement(arrow as HTMLElement);
    expect(icon.compareDocumentPosition(arrow!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});


it('shows the Extra Deck origin beneath the add-to-hand arrow', () => {
  const [action] = parseCombo('CL1 Activate [Junoldo] in the extra deck to add [Vidolium] from the extra deck');
  expect(action).toMatchObject({ chainLink: 1, sourceZone: 'extra-deck', targetOriginZone: 'extra-deck', targetZone: 'hand' });
  const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
  const badge = screen.getByText('From Extra Deck');
  const arrow = container.querySelector('lord-icon[src="https://cdn.lordicon.com/jarmuava.json"]');
  expect(arrow?.parentElement?.parentElement).toContainElement(badge);
  expect(arrow!.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});


describe('scale-only continuous glow', () => {
  it.each([
    'Scale [Card One] and [Card Two]',
    'Activate [Gilgamesh] to scale [Card One] and [Card Two]',
  ])('lights only the two scales in %s', (text) => {
    const [action] = parseCombo(text);
    const { container, rerender } = render(<ComboStepVisual action={action} stepNumber={1} />);
    expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-scale-border-glow][data-scale-side="left"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-scale-border-glow][data-scale-side="right"]')).toHaveLength(1);
    const [next] = parseCombo('Special Summon [Card One]');
    rerender(<ComboStepVisual action={next} stepNumber={1} />);
    expect(container.querySelector('[data-scale-border-glow]')).toBeNull();
  });
});


it('places the special summon badge on Graflare rather than the card it sets', () => {
  const [action] = parseCombo('SS [Graflare] and activate it to set [Artmage Varnish]');
  render(<ComboStepVisual action={action} stepNumber={1} />);
  const source = screen.getByRole('button', { name: 'Open full screen view for Graflare with a double click' });
  const target = screen.getByRole('button', { name: 'Open full screen view for Artmage Varnish with a double click' });
  expect(source.parentElement?.parentElement).toContainElement(screen.getByText('SS'));
  expect(target.parentElement?.parentElement).not.toContainElement(screen.getByText('SS'));
});


describe('activate-to-draw layout', () => {
  it.each([['', 1], [' 1.', 1], [' +1.', 1], [' one', 1], [' 2', 2], [' +2', 2], [' two', 2]])(
    'renders summon and activate to draw%s with its count', (suffix, amount) => {
      const [action] = parseCombo(`SS [Finmel] and activate it to draw${suffix}`);
      const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
      const card = screen.getByRole('button', { name: 'Open full screen view for Finmel with a double click' });
      expect(screen.getByText('Special Summon')).toBeInTheDocument();
      expect(screen.getByText('Activate')).toBeInTheDocument();
      expect(container.querySelector('.activate-cursor')).toBeInTheDocument();
      const draw = screen.getByRole('img', { name: `Draw ${amount} ${amount === 1 ? 'card' : 'cards'}` });
      expect(within(draw).getByText(`+${amount}`)).toBeInTheDocument();
      expect(card.compareDocumentPosition(draw) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getAllByRole('button', { name: /Open full screen view/ })).toHaveLength(1);
    },
  );
});


describe('tribute summon material layout', () => {
  it.each([
    'Tribute summon [Non-Finito] using [Nervedo] and [S/T].',
    'Tribute [Nervedo] and [S/T] to summon [Non-Finito].',
  ])('renders materials before the summoned monster: %s', (text) => {
    const [action] = parseCombo(text);
    const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
    expect(screen.getByText('Tribute Summon')).toBeInTheDocument();
    expect(screen.getByLabelText('Tribute Summon symbol').querySelector('svg')).toBeInTheDocument();
    const cards = screen.getAllByRole('button', { name: /Open full screen view/ });
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Open full screen view for Nervedo with a double click',
      'Open full screen view for S/T with a double click',
      'Open full screen view for Non-Finito with a double click',
    ]);
    expect(container.querySelector('.card-swap-container')).not.toBeInTheDocument();
  });

  it('uses the material stack for three tributes', () => {
    const [action] = parseCombo('Tribute [A], [B] and [C] to summon [Non-Finito]');
    render(<ComboStepVisual action={action} stepNumber={1} />);
    for (const name of ['A', 'B', 'C']) {
      expect(screen.getByLabelText(`Bring ${name} to front`)).toBeInTheDocument();
    }
  });
});


it('renders activate destroy then send to the Extra Deck', () => {
  const [action] = parseCombo('Activate [Shade the Obscure] to destroy [Nervedo] to send [Vidolium] to the extra deck');
  const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
  const cards = screen.getAllByRole('button', { name: /Open full screen view/ });
  expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
    'Open full screen view for Shade the Obscure with a double click',
    'Open full screen view for Nervedo with a double click',
    'Open full screen view for Vidolium with a double click',
  ]);
  expect(container.querySelector('.activate-cursor')).toBeInTheDocument();
  const icon = screen.getByRole('img', { name: 'Send to Extra Deck' });
  expect(icon.querySelector('svg')).toBeInTheDocument();
  expect(cards[1].compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(icon.compareDocumentPosition(cards[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText('In GY')).not.toBeInTheDocument();
});


it('shows the GY only on the activating card when Medius summons itself after returning a card', () => {
  const [action] = parseCombo('Activate [Medius] in the gy to return [Exceed the Pendulum] to the extra deck to ss itself');
  const { container } = render(<ComboStepVisual action={action} stepNumber={21} />);
  expect(screen.getAllByRole('button', { name: 'Open full screen view for Medius with a double click' })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Open full screen view for Exceed the Pendulum with a double click' })).toBeInTheDocument();
  expect(screen.getAllByText(/^GY$/)).toHaveLength(1);
  expect(screen.getByText('From GY')).toBeInTheDocument();
  expect(screen.getByText('Extra Deck')).toBeInTheDocument();
  expect(screen.getByText('SS')).toBeInTheDocument();
  expect(container.querySelector('.activate-cursor')).toBeInTheDocument();
});


it('renders a Pendulum Summon with individual card origins', () => {
  const [action] = parseCombo('Pendulum summon [Nervedo] from the hand and [Jupredo] from the extra deck');
  render(<ComboStepVisual action={action} stepNumber={1} />);
  expect(screen.getByText('Pendulum Summon')).toBeInTheDocument();
  const nervedo = screen.getByRole('button', { name: 'Open full screen view for Nervedo with a double click' });
  const jupredo = screen.getByRole('button', { name: 'Open full screen view for Jupredo with a double click' });
  expect(screen.getByText('Hand')).toBeInTheDocument();
  expect(screen.getByText('Extra Deck')).toBeInTheDocument();
  expect(nervedo.compareDocumentPosition(jupredo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});


it('renders counted draw then discard effects beside Junoldo', () => {
  const [action] = parseCombo('Activate [Junoldo] to draw 2 and discard 1.');
  const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
  expect(screen.getAllByRole('button', { name: /Open full screen view/ })).toHaveLength(1);
  expect(screen.getByText('Activate')).toBeInTheDocument();
  expect(screen.getByText('Draw')).toBeInTheDocument();
  expect(screen.getByText('Discard')).toBeInTheDocument();
  expect(container.querySelector('.activate-cursor')).toBeInTheDocument();
  const draw = screen.getByRole('img', { name: 'Draw 2 cards' });
  const discard = screen.getByRole('img', { name: 'Discard 1 card' });
  expect(within(draw).getByText('+2')).toBeInTheDocument();
  expect(within(discard).getByText('-1')).toBeInTheDocument();
  expect(draw.compareDocumentPosition(discard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});


it.each(["pendulum's effect", 'pendulum effect', 'as a scale'])('renders the pendulum effect chain for %s', (phrase) => {
  const [action] = parseCombo(`Activate [Vidolium] ${phrase} to destroy itself to ss [Artmage Power Patron] from the gy`);
  const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
  const cards = screen.getAllByRole('button', { name: /Open full screen view/ });
  expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
    'Open full screen view for Vidolium with a double click',
    'Open full screen view for Vidolium with a double click',
    'Open full screen view for Artmage Power Patron with a double click',
  ]);
  expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(1);
  expect(cards[0].querySelector('[data-scale-border-glow]')).toBeInTheDocument();
  expect(screen.getByText('Destroyed')).toBeInTheDocument();
  expect(screen.getByText('SS')).toBeInTheDocument();
  const origin = screen.getByText('From GY');
  expect(cards[1].compareDocumentPosition(origin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(origin.compareDocumentPosition(cards[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText('GY')).not.toBeInTheDocument();
});


it.each(["pendulum’s effect", "pendulum's effect", 'pendulum effect', 'as a scale'])(
  'renders a scale returning itself to hand with %s', (phrase) => {
    const [action] = parseCombo(`Activate [Shade the Obscure] ${phrase} to return itself to the hand.`);
    const { container } = render(<ComboStepVisual action={action} stepNumber={1} />);
    const cards = screen.getAllByRole('button', { name: 'Open full screen view for Shade the Obscure with a double click' });
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('[data-scale-border-glow]')).toBeInTheDocument();
    expect(cards[1].querySelector('[data-scale-border-glow]')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(1);
    expect(cards[1].parentElement?.parentElement).toContainElement(screen.getByText('Returned'));
    expect(cards[1].parentElement?.parentElement).toContainElement(screen.getByText('Hand'));
  },
);


it.each([
  ['Activate [Exceed the Pendulum] to ss [Nervedo] from the gy', 'Nervedo', 'From GY'],
  ['Activate [Exceed the Pendulum] to ss [Nervedo] from banishment', 'Nervedo', 'From Banished'],
  ['Activate [Exceed the Pendulum] to ss [Nervedo] from the hand', 'Nervedo', 'From Hand'],
  ['Activate [Card A] to destroy [Card B] to ss [Nervedo] from the gy', 'Nervedo', 'From GY'],
  ['Activate [Card A] to banish [Card B] from the gy and ss [Nervedo] from banishment', 'Nervedo', 'From Banished'],
])('shows the summon origin beneath the connector: %s', (text, target, originText) => {
  const [action] = parseCombo(text);
  render(<ComboStepVisual action={action} stepNumber={1} />);
  const origin = screen.getByText(originText);
  const card = screen.getByRole('button', { name: `Open full screen view for ${target} with a double click` });
  expect(origin.parentElement?.parentElement?.querySelector('lord-icon')).toBeInTheDocument();
  expect(origin.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(card.parentElement?.parentElement).not.toContainElement(origin);
  expect(screen.getByText('SS')).toBeInTheDocument();
});


it.each([
  '"No S/T in hand" Scale [Vidolium the unstable] and activate it to destroy itself and ss [Nervedo] from the gy',
  "Activate [Vidolium the unstable] pendulum’s effect to destroy itself and ss [Nervedo] from the gy",
])('renders a destroyed scale going to Extra Deck before the follow-up summon: %s', (text) => {
  const [action] = parseCombo(text);
  const { container } = render(<ComboStepVisual action={action} stepNumber={19} />);
  const cards = screen.getAllByRole('button', { name: /Open full screen view/ });
  expect(cards).toHaveLength(3);
  expect(cards[0].querySelector('[data-scale-border-glow]')).toBeInTheDocument();
  expect(cards[1].parentElement?.parentElement).toContainElement(screen.getByText('Destroyed'));
  expect(cards[1].parentElement?.parentElement).toContainElement(screen.getByText('Extra Deck'));
  expect(cards[2]).toHaveAttribute('aria-label', 'Open full screen view for Nervedo with a double click');
  expect(cards[2].parentElement?.parentElement).toContainElement(screen.getByText('SS'));
  const origin = screen.getByText('From GY');
  expect(origin.compareDocumentPosition(cards[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelectorAll('[data-scale-border-glow]')).toHaveLength(1);
  if (text.startsWith('"')) expect(screen.getByText('No S/T in hand')).toBeInTheDocument();
});
