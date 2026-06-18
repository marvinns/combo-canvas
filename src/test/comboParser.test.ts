import { describe, expect, it } from 'vitest';

import { getComboBranchGroups, getVisibleComboActionIndices, parseCombo } from '@/lib/comboParser';

describe('parseCombo scale syntax', () => {
  it('defaults a single scaled card to the right side', () => {
    const [action] = parseCombo('Scale [Odd-Eyes Pendulum Dragon]');

    expect(action.type).toBe('scale');
    expect(action.scaleSides).toEqual(['right']);
    expect(action.sourceCards).toEqual(['Odd-Eyes Pendulum Dragon']);
  });

  it('assigns the next unspecified single scale to the left when right is already used', () => {
    const actions = parseCombo([
      'Scale [Odd-Eyes Pendulum Dragon]',
      'Scale [Performapal Skullcrobat Joker]',
    ].join('\n'));

    expect(actions[0].scaleSides).toEqual(['right']);
    expect(actions[1].scaleSides).toEqual(['left']);
  });

  it('supports explicit left scale phrasing', () => {
    const [first, second] = parseCombo([
      'Scale [Wisdom-Eye Magician] to the left',
      'Put [Oafdragon Magician] on the right scale',
    ].join('\n'));

    expect(first.scaleSides).toEqual(['left']);
    expect(second.scaleSides).toEqual(['right']);
  });

  it('keeps paired scale syntax on left and right', () => {
    const [action] = parseCombo('Scale [Card A] and [Card B]');

    expect(action.scaleSides).toEqual(['left', 'right']);
    expect(action.sourceCards).toEqual(['Card A', 'Card B']);
  });

  it('parses activate to scale two cards as an inline activate scale step', () => {
    const [action] = parseCombo('CL2 Activate [Gilgamesh] to scale [Orthros] and [Oblivion King abyss]');

    expect(action.chainLink).toBe(2);
    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Scale']);
    expect(action.sourceCard).toBe('Gilgamesh');
    expect(action.targetCards).toEqual(['Orthros', 'Oblivion King abyss']);
    expect(action.scaleSides).toEqual(['left', 'right']);
  });

  it('parses activate to scale itself as an inline activate scale step', () => {
    const [action] = parseCombo('Activate [D/D/D Zero Demise] to scale itself.');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Scale']);
    expect(action.sourceCard).toBe('D/D/D Zero Demise');
    expect(action.targetCard).toBe('D/D/D Zero Demise');
    expect(action.scaleSides).toEqual(['right']);
  });

  it('parses scale then activate the scaled card to set as one compound step', () => {
    const lines = [
      'Scale [D/D/D Zero Demise] and activate [D/D/D Zero Demise] to set [Dark Contract with the zero king]',
      'Scale [D/D/D Zero Demise] and activate her to set [Dark Contract with the zero king]',
      'Scale [D/D/D Zero Demise] and activate it to set [Dark Contract with the zero king]',
      'Put [D/D/D Zero Demise] as a scale and activate [D/D/D Zero Demise] to set [Dark Contract with the zero king]',
    ];

    for (const line of lines) {
      const [action] = parseCombo(line);

      expect(action.type).toBe('scale');
      expect(action.label).toBe('Scale');
      expect(action.labels).toEqual(['Scale', 'Activate', 'Set']);
      expect(action.sourceCard).toBe('D/D/D Zero Demise');
      expect(action.sourceCards).toEqual(['D/D/D Zero Demise']);
      expect(action.scaleSides).toEqual(['right']);
      expect(action.targetCard).toBe('Dark Contract with the zero king');
    }
  });

  it.each([
    ['Scale [Lunalight Tiger] and activate it to ss [Kaleido Chick] from the gy', 'Special Summon', 'Kaleido Chick', 'gy'],
    ['Scale [Card A] and activate it to banish [Card B] from the gy', 'Banish', 'Card B', 'gy'],
    ['Scale [Card A] and activate it to detach [Card B]', 'Detach', 'Card B', undefined],
    ['Scale [Card A] and activate it to destroy [Card B]', 'Destroy', 'Card B', undefined],
    ['Scale [Card A] and activate it to negate [Card B]', 'Negate', 'Card B', undefined],
    ['Scale [Card A] and activate it to reveal [Card B]', 'Reveal', 'Card B', undefined],
    ['Scale [Card A] and activate it to tribute [Card B]', 'Tribute', 'Card B', undefined],
    ['Scale [Card A] and activate it to return [Card B] to the hand', 'Return', 'Card B', 'hand'],
    ['Scale [Card A] and activate it to send [Card B] to the gy', 'Send to GY', 'Card B', 'gy'],
  ])('parses scale then activate to %s through the generalized effect path', (line, label, targetCard, targetZone) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('scale');
    expect(action.label).toBe('Scale');
    expect(action.labels).toEqual(['Scale', 'Activate', label]);
    expect(action.targetCard).toBe(targetCard);
    expect(action.targetZone).toBe(targetZone);
  });
});

describe('parseCombo branching paths', () => {
  const branchingCombo = [
    '10. Normal Summon [Starter]',
    '11. Set [Route One], [Route Two] and [Route Three]',
    '11.1a Activate [Route One]',
    '11.2a Activate [Route Two]',
    '11.2b Search [Route Two Follow-up] from deck',
    '11.3a Activate [Route Three]',
    '11.3b Search [Route Three Follow-up] from deck',
    '11.3c Set [Route Three End]',
    '12. Activate [Shared Merge]',
  ].join('\n');

  it('annotates branch steps and finds a single shared merge point', () => {
    const actions = parseCombo(branchingCombo);
    const [branch] = getComboBranchGroups(actions);

    expect(actions[2].stepPath).toEqual({ label: '11.1a', baseStep: 11, route: 1, substep: 'a' });
    expect(branch.branchActionIndex).toBe(1);
    expect(branch.routes.map((route) => route.actionIndices.length)).toEqual([1, 2, 3]);
    expect(branch.mergeActionIndex).toBe(8);
  });

  it('shows only the selected route while retaining shared steps once', () => {
    const actions = parseCombo(branchingCombo);

    expect(getVisibleComboActionIndices(actions, {})).toEqual([0, 1, 8]);
    expect(getVisibleComboActionIndices(actions, { 11: 2 })).toEqual([0, 1, 3, 4, 8]);
  });

  it('numbers an unnumbered shared continuation after the branch base step', () => {
    const actions = parseCombo([
      '10. Set [Route One] and [Route Two]',
      '10.1a Activate [Route One]',
      '10.2a Activate [Route Two]',
      'Activate [Shared Merge]',
    ].join('\n'));

    expect(actions.map((action) => action.stepPath?.label)).toEqual(['10', '10.1a', '10.2a', '11']);
    expect(getComboBranchGroups(actions)[0].mergeActionIndex).toBe(3);
  });
});

describe('parseCombo ritual summon syntax', () => {
  it('parses ritual summon using one material', () => {
    const [action] = parseCombo('Ritual Summon [Card A] using [Card B]');

    expect(action.type).toBe('ritual');
    expect(action.label).toBe('Ritual Summon');
    expect(action.sourceCards).toEqual(['Card B']);
    expect(action.targetCard).toBe('Card A');
  });

  it('parses ritual summon using two materials', () => {
    const [action] = parseCombo('Ritual Summon [Card A] using [Card B] and [Card C]');

    expect(action.type).toBe('ritual');
    expect(action.sourceCards).toEqual(['Card B', 'Card C']);
    expect(action.targetCard).toBe('Card A');
  });

  it('parses tribute to ritual summon phrasing', () => {
    const [action] = parseCombo('Tribute [Card B] to ritual summon [Card A]');

    expect(action.type).toBe('ritual');
    expect(action.sourceCards).toEqual(['Card B']);
    expect(action.targetCard).toBe('Card A');
  });

  it('parses sacrifice to ritual summon phrasing', () => {
    const [action] = parseCombo('Sacrifice [Card B] to ritual summon [Card A]');

    expect(action.type).toBe('ritual');
    expect(action.sourceCards).toEqual(['Card B']);
    expect(action.targetCard).toBe('Card A');
  });
});

describe('parseCombo extra deck multi-material syntax', () => {
  it('parses synchro summon using two materials', () => {
    const [action] = parseCombo('Synchro Summon [Card A] using [Card B] and [Card C]');

    expect(action.type).toBe('synchro');
    expect(action.label).toBe('Synchro Summon');
    expect(action.sourceCards).toEqual(['Card B', 'Card C']);
    expect(action.targetCard).toBe('Card A');
  });

  it('parses xyz summon using more than two materials', () => {
    const [action] = parseCombo('Xyz Summon [Card A] using [Card B], [Card C], [Card D] and [Card E]');

    expect(action.type).toBe('xyz');
    expect(action.sourceCards).toEqual(['Card B', 'Card C', 'Card D', 'Card E']);
    expect(action.targetCard).toBe('Card A');
  });

  it('captures per-material source zones in summon using syntax', () => {
    const [action] = parseCombo('Synchro Summon [Nova] using [Crimson] from banishment, [Performapal] from hand, [Odd-Eyes] from GY and [Ash]');

    expect(action.type).toBe('synchro');
    expect(action.sourceCards).toEqual(['Crimson', 'Performapal', 'Odd-Eyes', 'Ash']);
    expect(action.sourceZones).toEqual(['banished', 'hand', 'gy', undefined]);
    expect(action.targetCard).toBe('Nova');
  });

  it('parses fuse into with more than two materials', () => {
    const [action] = parseCombo('Fuse [Card B], [Card C], [Card D] and [Card E] into [Card A]');

    expect(action.type).toBe('fusion');
    expect(action.sourceCards).toEqual(['Card B', 'Card C', 'Card D', 'Card E']);
    expect(action.targetCard).toBe('Card A');
  });
});

describe('parseCombo target syntax', () => {
  it('parses "A targets B" as an activate step with a target card', () => {
    const [action] = parseCombo('[Card A] targets [Card B]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Target']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses "Target [card]" as a target-only activate step', () => {
    const [action] = parseCombo('Target [Card B]');

    expect(action.type).toBe('target');
    expect(action.label).toBe('Target');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('Card B');
  });

  it('parses multiple negate targets in one step', () => {
    const [action] = parseCombo('[Droplet] negates [Ash], [Silver] and [Gold]');

    expect(action.type).toBe('negate');
    expect(action.sourceCard).toBe('Droplet');
    expect(action.targetCards).toEqual(['Ash', 'Silver', 'Gold']);
  });

  it('parses multiple set targets in one step', () => {
    const [action] = parseCombo('Set [Eternal Darkness] and [D/D/D Headhunt]');

    expect(action.type).toBe('set');
    expect(action.label).toBe('Set');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('Eternal Darkness');
    expect(action.targetCards).toEqual(['Eternal Darkness', 'D/D/D Headhunt']);
  });

  it('parses putting a card into the continuous spell and trap zone with a source card', () => {
    const [action] = parseCombo('[Card A] puts [Card B] in the continous spell and trap zone');

    expect(action.type).toBe('continuous');
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses direct put into the continuous spell and trap zone phrasing', () => {
    const [action] = parseCombo('put [Card B] in the Continous Spell & Trap Zone');

    expect(action.type).toBe('continuous');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate in the gy and put itself in the continuous spell and trap zone', () => {
    const [action] = parseCombo('Activate [snake-eyes poplar] in the gy and put it in the continuous spell and trap zone');

    expect(action.type).toBe('continuous');
    expect(action.sourceCard).toBe('snake-eyes poplar');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('snake-eyes poplar');
  });

  it('parses activate to put a target in the continuous spell and trap zone and special summon itself', () => {
    const [action] = parseCombo('Activate [snake-eyes diabellstar] to put [snake-eyes poplar] in the continuous spell and trap zone and ss itself.');

    expect(action.type).toBe('continuous');
    expect(action.labels).toEqual(['Activate', 'Continuous Spell & Trap', 'Special Summon']);
    expect(action.sourceCard).toBe('snake-eyes diabellstar');
    expect(action.targetCard).toBe('snake-eyes poplar');
    expect(action.followUpCard).toBe('snake-eyes diabellstar');
  });

  it('parses activate and place in the field spell zone with source and target cards', () => {
    const [action] = parseCombo('Activate [card A] and place [card B] in the field spell zone.');

    expect(action.type).toBe('field-spell');
    expect(action.labels).toEqual(['Activate', 'Field Spell Zone']);
    expect(action.sourceCard).toBe('card A');
    expect(action.targetCard).toBe('card B');
  });

  it('parses direct put in the field spell zone phrasing', () => {
    const [action] = parseCombo('put [card] in the field spell zone.');

    expect(action.type).toBe('field-spell');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('card');
  });

  it('parses activate field spell phrasing', () => {
    const [action] = parseCombo('activate field spell [card].');

    expect(action.type).toBe('field-spell');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('card');
  });

  it('parses use field spell phrasing', () => {
    const [action] = parseCombo('use field spell [card].');

    expect(action.type).toBe('field-spell');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('card');
  });
});

describe('parseCombo activate effect syntax', () => {
  it('parses activate to destroy with compound labels', () => {
    const [action] = parseCombo('Activate [Card A] to destroy [Card B]');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Destroy']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses simple activate with no target or follow-up', () => {
    const [action] = parseCombo('Activate [Mask Change].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.sourceCard).toBe('Mask Change');
    expect(action.targetCard).toBeUndefined();
  });

  it('parses activate to banish with compound labels', () => {
    const [action] = parseCombo('Activate [Card A] to banish [Card B]');

    expect(action.labels).toEqual(['Activate', 'Banish']);
  });

  it('parses activate to set with compound labels', () => {
    const [action] = parseCombo('Activate [Card A] to set [Card B]');

    expect(action.labels).toEqual(['Activate', 'Set']);
  });

  it('parses activate to return with optional destination', () => {
    const [action] = parseCombo('Activate [Card A] to return [Card B] to the hand');

    expect(action.labels).toEqual(['Activate', 'Return']);
    expect(action.targetZone).toBe('hand');
  });

  it('parses activate from gy to return a card to hand', () => {
    const [action] = parseCombo('Activate [Scale Surveyor] in the gy to return [D/D/D Zero Demise] to the hand.');

    expect(action.labels).toEqual(['Activate', 'Return']);
    expect(action.sourceCard).toBe('Scale Surveyor');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('D/D/D Zero Demise');
    expect(action.targetZone).toBe('hand');
  });

  it('parses CL activate target in gy and return it to hand', () => {
    const [action] = parseCombo('CL2 Activate [Kaleido Chick] to target [Polymerization] in the gy and return it to the hand');

    expect(action.chainLink).toBe(2);
    expect(action.labels).toEqual(['Activate', 'Target', 'Return']);
    expect(action.sourceCard).toBe('Kaleido Chick');
    expect(action.targetCard).toBe('Polymerization');
    expect(action.targetOriginZone).toBe('gy');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Polymerization');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate to return multiple cards without an explicit destination', () => {
    const [action] = parseCombo('Activate [mignon] to return [marshmao] and [cupsy]');

    expect(action.labels).toEqual(['Activate', 'Return']);
    expect(action.sourceCard).toBe('mignon');
    expect(action.targetCard).toBe('marshmao');
    expect(action.targetCards).toEqual(['marshmao', 'cupsy']);
    expect(action.targetZone).toBeUndefined();
  });

  it('parses activate to return multiple cards with an explicit destination', () => {
    const [action] = parseCombo('Activate [mignon] to return [marshmao] and [cupsy] to the hand');

    expect(action.labels).toEqual(['Activate', 'Return']);
    expect(action.targetCards).toEqual(['marshmao', 'cupsy']);
    expect(action.targetZone).toBe('hand');
    expect(action.targetZones).toEqual(['hand', 'hand']);
  });

  it('parses activate to special summon with optional source zone', () => {
    const [action] = parseCombo('Activate [Card A] to special summon [Card B] from the GY');

    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate in the gy to ss from the gy with a repeated article', () => {
    const [action] = parseCombo('Activate [sigma plus] in the gy to ss [Epsilon] from the the gy');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('sigma plus');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('Epsilon');
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate to special summon from banished zone', () => {
    const [action] = parseCombo('Activate [Card A] to special summon [Card B] from banished zone');

    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.targetZone).toBe('banished');
  });

  it('parses activate to special summon multiple cards with comma syntax', () => {
    const [action] = parseCombo('Activate [flamberge] in the gy to ss [snake-eye oak], [snake-eye ash].');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('flamberge');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('snake-eye oak');
    expect(action.targetCards).toEqual(['snake-eye oak', 'snake-eye ash']);
  });

  it('parses activate to special summon multiple cards with and syntax', () => {
    const [action] = parseCombo('Activate [flamberge] in the gy to ss [snake-eye oak] and [snake-eye ash].');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('flamberge');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('snake-eye oak');
    expect(action.targetCards).toEqual(['snake-eye oak', 'snake-eye ash']);
  });

  it('parses activate in the gy and special summon itself', () => {
    const [action] = parseCombo('Activate [snake-eyes poplar] in the gy and ss itself');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('snake-eyes poplar');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('snake-eyes poplar');
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate and special summon it from the gy as a self-summon effect', () => {
    const [action] = parseCombo('Activate [sorrowcat] and ss it from the gy');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('sorrowcat');
    expect(action.targetCard).toBe('sorrowcat');
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate to search with compound labels', () => {
    const [action] = parseCombo('Activate [Card A] to search [Card B]');

    expect(action.labels).toEqual(['Activate', 'Search']);
  });

  it('parses activate comma search shorthand as the same search action', () => {
    const [action] = parseCombo('Activate [Card A], search [Card B].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Search']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate to add to hand with compound labels', () => {
    const [action] = parseCombo('Activate [Miracle Ejector] to add [EN Shuffle] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Miracle Ejector');
    expect(action.targetCard).toBe('EN Shuffle');
  });

  it('keeps tagged card names clean while preserving the raw tagged line', () => {
    const [suffixAction] = parseCombo('Activate [Miracle Ejector](lvl 4) to add [EN Shuffle] to hand.');
    const [prefixAction] = parseCombo('Activate (lvl3)[Miracle Ejector] to add [EN Shuffle] to hand.');

    expect(suffixAction.sourceCard).toBe('Miracle Ejector');
    expect(suffixAction.raw).toContain('[Miracle Ejector](lvl 4)');
    expect(prefixAction.sourceCard).toBe('Miracle Ejector');
    expect(prefixAction.raw).toContain('(lvl3)[Miracle Ejector]');
  });

  it('ignores quoted custom step tags while preserving them in raw text', () => {
    const [action] = parseCombo('Activate [Miracle Ejector] to add [EN Shuffle] to hand "floodgate".');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Miracle Ejector');
    expect(action.targetCard).toBe('EN Shuffle');
    expect(action.raw).toContain('"floodgate"');
  });

  it('parses activate comma add shorthand as the same add to hand action', () => {
    const [action] = parseCombo('Activate [Miracle Ejector], add [EN Shuffle].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Miracle Ejector');
    expect(action.targetCard).toBe('EN Shuffle');
  });

  it('parses activate to add to the hand phrasing', () => {
    const [action] = parseCombo('Activate [Flame wingman] to add [Favorite Contact] to the hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Flame wingman');
    expect(action.targetCard).toBe('Favorite Contact');
  });

  it('parses activate to add multiple cards to hand with and syntax', () => {
    const [action] = parseCombo('Activate [cupsy] to add [Cupsy☆Yummy] and [cooky] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('cupsy');
    expect(action.targetCard).toBe('Cupsy☆Yummy');
    expect(action.targetCards).toEqual(['Cupsy☆Yummy', 'cooky']);
    expect(action.targetZones).toEqual(['hand', 'hand']);
  });

  it('parses activate to add multiple cards to hand with comma syntax', () => {
    const [action] = parseCombo('Activate [cupsy] to add [Cupsy☆Yummy], [cooky] to hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('cupsy');
    expect(action.targetCard).toBe('Cupsy☆Yummy');
    expect(action.targetCards).toEqual(['Cupsy☆Yummy', 'cooky']);
    expect(action.targetZones).toEqual(['hand', 'hand']);
  });

  it('parses activate to add from the deck as add to hand', () => {
    const [action] = parseCombo('Activate [dusk crow] to add [furnace] from the deck.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('dusk crow');
    expect(action.targetCard).toBe('furnace');
    expect(action.targetZone).toBe('hand');
    expect(action.targetOriginZone).toBe('deck');
  });

  it('parses activate in the gy to add to hand with source zone preserved', () => {
    const [action] = parseCombo('Activate [shadow mist] in the GY to add [hero neos] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('shadow mist');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('hero neos');
    expect(action.targetZone).toBe('hand');
  });

  it('parses activate in the gy to add itself to the hand', () => {
    const [action] = parseCombo('Activate [linear magnum plus] in the gy to add itself to the hand');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('linear magnum plus');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('linear magnum plus');
    expect(action.targetZone).toBe('hand');
  });

  it('parses activate to add then discard as one compound step', () => {
    const [action] = parseCombo('Activate [furnace] to add [mask change] to hand, then discard [furnace]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand', 'Discard']);
    expect(action.sourceCard).toBe('furnace');
    expect(action.targetCard).toBe('mask change');
    expect(action.targetZone).toBe('hand');
  });

  it('parses activate to add and discard as one compound step', () => {
    const lines = [
      'Activate [Gold Leo] to add [Silver Hound] to the hand and to discard [Silver Hound]',
      'Activate [Gold Leo] to add [Silver Hound] to the hand and discard [Silver Hound]',
      'Activate [Gold Leo] to add [Silver Hound] and discard [Silver Hound]',
    ];

    for (const line of lines) {
      const [action] = parseCombo(line);

      expect(action.type).toBe('activate');
      expect(action.label).toBe('Activate');
      expect(action.labels).toEqual(['Activate', 'Add to Hand', 'Discard']);
      expect(action.sourceCard).toBe('Gold Leo');
      expect(action.targetCard).toBe('Silver Hound');
      expect(action.targetZone).toBe('hand');
      expect(action.followUpCard).toBe('Silver Hound');
      expect(action.followUpZone).toBe('gy');
    }
  });

  it('parses activate to add a card then discard a different card with shortened add wording', () => {
    const [action] = parseCombo('Activate [Gold Leo] to add [Kaleido Chick] and discard [card]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand', 'Discard']);
    expect(action.sourceCard).toBe('Gold Leo');
    expect(action.targetCard).toBe('Kaleido Chick');
    expect(action.targetZone).toBe('hand');
    expect(action.followUpCard).toBe('card');
    expect(action.followUpZone).toBe('gy');
  });

  it('parses activate to discard itself and add to hand as one compound step', () => {
    const [action] = parseCombo('Activate [Lunalight Black Sheep] to discard itself and add [Polymerization] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Discard', 'Add to Hand']);
    expect(action.sourceCard).toBe('Lunalight Black Sheep');
    expect(action.targetCard).toBe('Lunalight Black Sheep');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Polymerization');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate to discard as a compound activate step', () => {
    const [action] = parseCombo('Activate [Gold Leo] to discard [Silver Hound]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Discard']);
    expect(action.sourceCard).toBe('Gold Leo');
    expect(action.targetCard).toBe('Silver Hound');
  });

  it('parses activate reveal then add two cards to hand as one compound step', () => {
    const [action] = parseCombo('Activate [infernal devicer], reveal [Elemental HERO Nebula Neos], then add [Neo-Spacian Grand Mole] and [Neo-Spacian Dark Panther] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Reveal', 'Add to Hand']);
    expect(action.sourceCard).toBe('infernal devicer');
    expect(action.targetCard).toBe('Elemental HERO Nebula Neos');
    expect(action.followUpCards).toEqual(['Neo-Spacian Grand Mole', 'Neo-Spacian Dark Panther']);
    expect(action.followUpZones).toEqual(['hand', 'hand']);
  });

  it('parses activate reveal itself to special summon as one compound step', () => {
    const [action] = parseCombo('Activate [hero fountain], reveal itself to ss [spirit of neos] from Hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Reveal', 'Special Summon']);
    expect(action.sourceCard).toBe('hero fountain');
    expect(action.targetCard).toBe('hero fountain');
    expect(action.followUpCard).toBe('spirit of neos');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate comma add to the hand without space after comma', () => {
    const [action] = parseCombo('Activate [Flame wingman],add [Favorite Contact] to the hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Flame wingman');
    expect(action.targetCard).toBe('Favorite Contact');
  });

  it('parses activate from hand to send to gy and special summon itself as a chained effect', () => {
    const [action] = parseCombo('Activate [Card A] from hand to send [Card B] to the GY and special summon itself.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY', 'Special Summon']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Card A');
  });

  it('parses activate send from hand to gy then special summon from gy as a chained effect', () => {
    const [action] = parseCombo('Activate [elfnotes: Rhapsodia of Madness] to send [elfnote regina] from the hand to the gy to ss [elfnote power patron] from the gy');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY', 'Special Summon']);
    expect(action.sourceCard).toBe('elfnotes: Rhapsodia of Madness');
    expect(action.targetCard).toBe('elfnote regina');
    expect(action.targetOriginZone).toBe('hand');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('elfnote power patron');
    expect(action.followUpZone).toBe('gy');
  });

  it('parses activate send multiple cards to gy then special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [snake-eye ash], send [snake-eye ash] and [snake-eyes poplar] to the gy and ss [snake-eye oak] from the deck');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY', 'Special Summon']);
    expect(action.sourceCard).toBe('snake-eye ash');
    expect(action.targetCard).toBe('snake-eye ash');
    expect(action.targetCards).toEqual(['snake-eye ash', 'snake-eyes poplar']);
    expect(action.targetZone).toBe('gy');
    expect(action.targetZones).toEqual(['gy', 'gy']);
    expect(action.followUpCard).toBe('snake-eye oak');
    expect(action.followUpZone).toBe('deck');
  });

  it('parses activate send to gy then add to hand as a chained effect', () => {
    const [action] = parseCombo('Activate [Rciela, sinister] to send [tales of the white] to the gy and add [witch of the white forest] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY', 'Add to Hand']);
    expect(action.sourceCard).toBe('Rciela, sinister');
    expect(action.targetCard).toBe('tales of the white');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('witch of the white forest');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate from hand to banish and special summon itself as a chained effect', () => {
    const [action] = parseCombo('Activate [dusk crow] from hand to banish [sunrise] and SS itself.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish', 'Special Summon']);
    expect(action.sourceCard).toBe('dusk crow');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('sunrise');
    expect(action.followUpCard).toBe('dusk crow');
  });

  it('parses activate in hand to banish from gy and special summon itself as a chained effect', () => {
    const [action] = parseCombo('Activate [dusk crow] in hand to banish [stratos] from the GY and ss itself.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish', 'Special Summon']);
    expect(action.sourceCard).toBe('dusk crow');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('stratos');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('dusk crow');
  });

  it('parses activate banish then add to hand as a chained effect', () => {
    const [action] = parseCombo('Activate [vyon] to banish [shadow mist] from the GY and add [polymerization] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish', 'Add to Hand']);
    expect(action.sourceCard).toBe('vyon');
    expect(action.targetCard).toBe('shadow mist');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('polymerization');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate in gy to banish itself and return a bare-name card to the deck as a chained effect', () => {
    const [action] = parseCombo('CL1 Activate wanted in the gy to banish itself and return sinful spoils of the white forest to the deck');

    expect(action.chainLink).toBe(1);
    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish', 'Return']);
    expect(action.sourceCard).toBe('wanted');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('wanted');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('sinful spoils of the white forest');
    expect(action.followUpZone).toBe('deck');
  });

  it('parses activate tribute then add to hand as a chained effect', () => {
    const [action] = parseCombo('activate [deception of the] to tribute [silvy] and add [the hallowed Azamina] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Tribute', 'Add to Hand']);
    expect(action.sourceCard).toBe('deception of the');
    expect(action.targetCard).toBe('silvy');
    expect(action.followUpCard).toBe('the hallowed Azamina');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate detach then add to hand as a chained effect', () => {
    const [action] = parseCombo('Activate [Solomon] to detach [Scale Surveyor] and add [D/D Savant Kepler] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Detach', 'Add to Hand']);
    expect(action.sourceCard).toBe('Solomon');
    expect(action.targetCard).toBe('Scale Surveyor');
    expect(action.followUpCard).toBe('D/D Savant Kepler');
    expect(action.followUpZone).toBe('hand');
  });

  it.each([
    ['Activate [Tiger King] to detach [Kaleido Chick]', 'Detach', 'Kaleido Chick'],
    ['Activate [Card A] to negate [Card B]', 'Negate', 'Card B'],
    ['Activate [Card A] to reveal [Card B]', 'Reveal', 'Card B'],
    ['Activate [Card A] to tribute [Card B]', 'Tribute', 'Card B'],
    ['Activate [Card A] to draw [Card B]', 'Draw', 'Card B'],
  ])('parses simple activated %s effects', (line, label, targetCard) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', label]);
    expect(action.targetCard).toBe(targetCard);
  });

  it.each([
    ['Activate [Card A] to fusion summon [Card B]', 'Fusion Summon'],
    ['Activate [Card A] to synchro summon [Card B]', 'Synchro Summon'],
    ['Activate [Card A] to link summon [Card B]', 'Link Summon'],
    ['Activate [Card A] to xyz summon [Card B]', 'Xyz Summon'],
    ['Activate [Card A] to ritual summon [Card B]', 'Ritual Summon'],
    ['Activate [Card A] to pendulum summon [Card B]', 'Pendulum Summon'],
  ])('parses simple activated summon line %s', (line, label) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', label]);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses generic activate destroy then add to hand as a chained effect', () => {
    const [action] = parseCombo('Activate [Card A] to destroy [Card B] and add [Card C] from the deck to the hand');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Destroy', 'Add to Hand']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
    expect(action.followUpCard).toBe('Card C');
    expect(action.followUpZone).toBe('hand');
    expect(action.targetOriginZone).toBe('deck');
  });

  it('parses an end phase activate send then destroy as a three-way effect', () => {
    const [action] = parseCombo('EP Activate (First Effect)[The Fallen & The Virtuous] to send [Albion] to the gy and destroy [Incredible Ecclesia]');

    expect(action.type).toBe('activate');
    expect(action.phase).toBe('End Phase');
    expect(action.labels).toEqual(['Activate', 'Send to GY', 'Destroy']);
    expect(action.sourceCard).toBe('The Fallen & The Virtuous');
    expect(action.targetCard).toBe('Albion');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Incredible Ecclesia');
    expect(action.raw).toContain('(First Effect)[The Fallen & The Virtuous]');
  });

  it('parses activate add then return as a three-way effect', () => {
    const [action] = parseCombo('Activate [Springans Kitt] to add [Retribution] to the hand and return [card] to the deck');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand', 'Return']);
    expect(action.sourceCard).toBe('Springans Kitt');
    expect(action.targetCard).toBe('Retribution');
    expect(action.targetZone).toBe('hand');
    expect(action.followUpCard).toBe('card');
    expect(action.followUpZone).toBe('deck');
  });

  it('parses an end phase target in gy then add to hand as a three-way effect', () => {
    const [action] = parseCombo('EP Activate [Branded in Red] to target [Fallen of the White] in the gy and add [Fallen of the White] to the hand');

    expect(action.type).toBe('activate');
    expect(action.phase).toBe('End Phase');
    expect(action.labels).toEqual(['Activate', 'Target', 'Add to Hand']);
    expect(action.sourceCard).toBe('Branded in Red');
    expect(action.targetCard).toBe('Fallen of the White');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Fallen of the White');
    expect(action.followUpZone).toBe('hand');
  });

  it.each([
    ['Activate [Card A] to negate [Card B] and reveal [Card C]', 'Negate', 'Reveal'],
    ['Activate [Card A] to reveal [Card B] then set [Card C]', 'Reveal', 'Set'],
    ['Activate [Card A] to search for [Card B] from the deck and detach [Card C]', 'Search', 'Detach'],
    ['Activate [Card A] to draw 2 cards then destroy [Card C]', 'Draw', 'Destroy'],
    ['Activate [Card A] to tribute [Card B] and negate [Card C]', 'Tribute', 'Negate'],
    ['Activate [Card A] to target [Card B] then discard [Card C]', 'Target', 'Discard'],
    ['Activate [Card A] to set [Card B] and banish [Card C]', 'Set', 'Banish'],
    ['Activate [Card A] to special summon [Card B] then return [Card C] to the deck', 'Special Summon', 'Return'],
    ['Activate [Card A] to negate [Card B] then fusion summon [Card C]', 'Negate', 'Fusion Summon'],
    ['Activate [Card A] to scale [Card B] then destroy [Card C]', 'Scale', 'Destroy'],
    ['Activate [Card A] to place [Card B] in the field spell zone then reveal [Card C]', 'Field Spell Zone', 'Reveal'],
    ['Activate [Card A] to put [Card B] in the continuous spell and trap zone then set [Card C]', 'Continuous Spell & Trap', 'Set'],
  ])('parses arbitrary activate effect pairs: %s', (line, firstLabel, secondLabel) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', firstLabel, secondLabel]);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe(firstLabel === 'Draw' ? '2 cards' : 'Card B');
    expect(action.followUpCard).toBe('Card C');
  });

  it.each([
    ['Activate [Card A] to search for [Card B] from the deck', 'Search', 'Card B', 'hand'],
    ['Activate [Card A] to draw 2 cards', 'Draw', '2 cards', 'hand'],
  ])('parses generic two-way activate effects: %s', (line, label, targetCard, targetZone) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', label]);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe(targetCard);
    expect(action.targetZone).toBe(targetZone);
  });

  it('parses activate discard then set as a three-way effect', () => {
    const [action] = parseCombo('Activate [Knightmare Gryphon] to discard [card], then set [magnet bonding]');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Discard', 'Set']);
    expect(action.sourceCard).toBe('Knightmare Gryphon');
    expect(action.targetCard).toBe('card');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('magnet bonding');
  });

  it('parses generic activate target then special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [Card A] to target [Card B] from the gy and ss [Card C] from the deck');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Target', 'Special Summon']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('Card C');
    expect(action.followUpZone).toBe('deck');
  });

  it('parses activate destroy to special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [Dark Contract with the zero king] to destroy [D/D/D Zero Demise] to ss [D/D Savant Copernicus]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Destroy', 'Special Summon']);
    expect(action.sourceCard).toBe('Dark Contract with the zero king');
    expect(action.targetCard).toBe('D/D/D Zero Demise');
    expect(action.followUpCard).toBe('D/D Savant Copernicus');
  });

  it('parses activate in gy destroy to special summon itself as a chained effect', () => {
    const [action] = parseCombo('Activate [D/D Lance Soldier] in the gy to destroy [Dark Contract with the Gate] to ss itself.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Destroy', 'Special Summon']);
    expect(action.sourceCard).toBe('D/D Lance Soldier');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('Dark Contract with the Gate');
    expect(action.followUpCard).toBe('D/D Lance Soldier');
    expect(action.followUpZone).toBe('gy');
  });

  it('parses activate special summon then add to hand as a chained effect', () => {
    const [action] = parseCombo('Activate [Engage Neo Space] to ss [Spirit of Neos] and add [polymerization] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon', 'Add to Hand']);
    expect(action.sourceCard).toBe('Engage Neo Space');
    expect(action.targetCard).toBe('Spirit of Neos');
    expect(action.followUpCard).toBe('polymerization');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses chain activate special summon itself then destroy itself as a chained effect', () => {
    const [action] = parseCombo('CL2 Activate [D/D/D Zero Demise] to ss itself then destroy itself');

    expect(action.chainLink).toBe(2);
    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon', 'Destroy']);
    expect(action.sourceCard).toBe('D/D/D Zero Demise');
    expect(action.targetCard).toBe('D/D/D Zero Demise');
    expect(action.followUpCard).toBe('D/D/D Zero Demise');
  });

  it('parses activate comma special summon then add shorthand as the same chained effect', () => {
    const [action] = parseCombo('Activate [Engage Neo Space], ss [Spirit of Neos] and add [polymerization] to hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Special Summon', 'Add to Hand']);
    expect(action.sourceCard).toBe('Engage Neo Space');
    expect(action.targetCard).toBe('Spirit of Neos');
    expect(action.followUpCard).toBe('polymerization');
    expect(action.followUpZone).toBe('hand');
  });

  it('parses activate from hand to banish from gy to special summon itself as a chained effect', () => {
    const [action] = parseCombo('Activate [dusk crow] from hand to banish [hero sunrise] from gy to ss itself.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish', 'Special Summon']);
    expect(action.sourceCard).toBe('dusk crow');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('hero sunrise');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('dusk crow');
  });

  it('parses activate return then special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [EN Shuffle], return [Miracle Ejector] to the deck, special summon [Spirit of Neos].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.sourceCard).toBe('EN Shuffle');
    expect(action.targetCard).toBe('Miracle Ejector');
    expect(action.targetZone).toBe('deck');
    expect(action.followUpCard).toBe('Spirit of Neos');
  });

  it('parses activate to return then special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [EN Shuffle] to return [Miracle Ejector] to the deck and Special summon [Spirit of Neos]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.sourceCard).toBe('EN Shuffle');
    expect(action.targetCard).toBe('Miracle Ejector');
    expect(action.targetZone).toBe('deck');
    expect(action.followUpCard).toBe('Spirit of Neos');
  });

  it('parses activate in the gy to return to the extra deck and special summon itself', () => {
    const [action] = parseCombo('Activate silvy in the gy to return [Rciela, sinister] to the extra deck and ss itself');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.sourceCard).toBe('silvy');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('Rciela, sinister');
    expect(action.targetZone).toBe('extra-deck');
    expect(action.followUpCard).toBe('silvy');
  });

  it('parses activate return multiple cards then special summon as a chained effect', () => {
    const [action] = parseCombo('Activate [favorite contact], return [Hero Neos], [Neo-Spacian Dolphin], [Neo-Spacian Grand Mole] and [Neo-Spacian Dark Panther] to deck and SS [Cosmo neos]');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.targetCards).toEqual(['Hero Neos', 'Neo-Spacian Dolphin', 'Neo-Spacian Grand Mole', 'Neo-Spacian Dark Panther']);
    expect(action.targetZones).toEqual(['deck', 'deck', 'deck', 'deck']);
    expect(action.followUpCard).toBe('Cosmo neos');
  });

  it('parses activate shuffle itself back to deck to special summon as return plus summon', () => {
    const [action] = parseCombo('Activate [Spirit of Neos], shuffle itself back to deck to SS [Elemental Hero Neos].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.sourceCard).toBe('Spirit of Neos');
    expect(action.targetCard).toBe('Spirit of Neos');
    expect(action.targetZone).toBe('deck');
    expect(action.followUpCard).toBe('Elemental Hero Neos');
  });

  it('parses activate to shuffle itself back to deck and special summon as return plus summon', () => {
    const [action] = parseCombo('Activate [spirit of neos] to shuffle itself back to deck and ss [hero Neos]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return', 'Special Summon']);
    expect(action.sourceCard).toBe('spirit of neos');
    expect(action.targetCard).toBe('spirit of neos');
    expect(action.targetZone).toBe('deck');
    expect(action.followUpCard).toBe('hero Neos');
  });

  it('parses activate fuse into as an activate plus fusion summon step', () => {
    const [action] = parseCombo('Activate [Polymerization], fuse [hero neos] and [stratos] into [Flame wingman].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('Polymerization');
    expect(action.sourceCards).toEqual(['hero neos', 'stratos']);
    expect(action.targetCard).toBe('Flame wingman');
  });

  it('parses activate to fuse into as the same activate plus fusion summon step', () => {
    const [action] = parseCombo('Activate [polymerization] to fuse [hero Furnace] and [dusk crow] into [contrast hero]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('polymerization');
    expect(action.sourceCards).toEqual(['hero Furnace', 'dusk crow']);
    expect(action.targetCard).toBe('contrast hero');
  });

  it('parses activate to fusion summon using a material as an activate plus fusion summon step', () => {
    const [action] = parseCombo('Activate [the hallowed Azamina] to fusion summon [Mu Rcielago] using [deception of the]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('the hallowed Azamina');
    expect(action.sourceCards).toEqual(['deception of the']);
    expect(action.targetCard).toBe('Mu Rcielago');
  });

  it('parses activate fusion summon using multiple materials with a comma variant', () => {
    const [action] = parseCombo('Activate [the hallowed Azamina], fusion summon [Mu Rcielago] using [deception of the] and [Azamina Aphes]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('the hallowed Azamina');
    expect(action.sourceCards).toEqual(['deception of the', 'Azamina Aphes']);
    expect(action.targetCard).toBe('Mu Rcielago');
  });

  it('parses activate in gy to fusion summon using materials from gy', () => {
    const [action] = parseCombo('Activate [Necro Slime] in the gy to fusion summon [Alfred] using [Gilgamesh] and [Necro Slime] from the gy');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('Necro Slime');
    expect(action.sourceZone).toBe('gy');
    expect(action.sourceCards).toEqual(['Gilgamesh', 'Necro Slime']);
    expect(action.sourceZones).toEqual(['gy', 'gy']);
    expect(action.targetCard).toBe('Alfred');
  });

  it('parses activate fusion summon using without brackets', () => {
    const [action] = parseCombo('Activate the hallowed Azamina to fusion summon Azamina ilia using sinful spoils of the white forest');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('the hallowed Azamina');
    expect(action.sourceCards).toEqual(['sinful spoils of the white forest']);
    expect(action.targetCard).toBe('Azamina ilia');
  });

  it('parses activate to banish multiple cards from the gy', () => {
    const [action] = parseCombo('Activate [miracle fusion] to banish [flame destroyer] and [hero neos] from the GY.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish']);
    expect(action.sourceCard).toBe('miracle fusion');
    expect(action.targetCards).toEqual(['flame destroyer', 'hero neos']);
    expect(action.targetZones).toEqual(['gy', 'gy']);
  });

  it('parses activate to banish three cards from the gy for cascading target view', () => {
    const [action] = parseCombo('Activate [miracle fusion] to banish [flame destroyer], [hero neos] and [stratos] from the GY.');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Banish']);
    expect(action.targetCards).toEqual(['flame destroyer', 'hero neos', 'stratos']);
    expect(action.targetZones).toEqual(['gy', 'gy', 'gy']);
  });

  it('parses activate to target with compound labels', () => {
    const [action] = parseCombo('Activate [Card A] to target [Card B]');

    expect(action.labels).toEqual(['Activate', 'Target']);
  });

  it('parses activate target and set it as one compound step', () => {
    const [action] = parseCombo('Activate [wonder driver] target [miracle fusion] and set it.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Target', 'Set']);
    expect(action.sourceCard).toBe('wonder driver');
    expect(action.targetCard).toBe('miracle fusion');
  });

  it('parses activate target from gy and set it as one compound step', () => {
    const [action] = parseCombo('Activate [wonder driver] target [miracle fusion] from GY and set it.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Target', 'Set']);
    expect(action.sourceCard).toBe('wonder driver');
    expect(action.targetCard).toBe('miracle fusion');
    expect(action.targetZone).toBe('gy');
  });

  it('parses generic discard into special summon then add to hand as one chained step', () => {
    const [action] = parseCombo('Discard [card A] to ss [card B] and add [card C] from the deck to the hand');

    expect(action.labels).toEqual(['Discard', 'Special Summon', 'Add to Hand']);
    expect(action.sourceCard).toBe('card A');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('card B');
    expect(action.followUpCard).toBe('card C');
    expect(action.followUpZone).toBe('hand');
    expect(action.targetOriginZone).toBe('deck');
  });

  it.each([
    'Discard [card] and add [Fallen of the White] to the hand.',
    'Discard [card] then add [Fallen of the White] to the hand.',
  ])('parses a simple discard then add-to-hand step: %s', (line) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('discard');
    expect(action.labels).toEqual(['Discard', 'Add to Hand']);
    expect(action.sourceCard).toBe('card');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('Fallen of the White');
    expect(action.targetZone).toBe('hand');
  });

  it('parses generic discard into target then special summon as one chained step', () => {
    const [action] = parseCombo('Discard [card A] to target [card B] from the gy and ss [card C] from the deck');

    expect(action.labels).toEqual(['Discard', 'Target', 'Special Summon']);
    expect(action.sourceCard).toBe('card A');
    expect(action.targetCard).toBe('card B');
    expect(action.targetZone).toBe('gy');
    expect(action.followUpCard).toBe('card C');
    expect(action.followUpZone).toBe('deck');
  });

  it('parses activate comma target shorthand as the same target action', () => {
    const [action] = parseCombo('Activate [Card A], target [Card B].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Target']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate comma send shorthand as the same send to gy action', () => {
    const [action] = parseCombo('Activate [Card A], send [Card B] to the GY.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate send from deck to gy with target origin preserved', () => {
    const [action] = parseCombo('Activate [D/D Savant Copernicus] to send [D/D Lance Soldier] from the deck to the gy.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('D/D Savant Copernicus');
    expect(action.targetCard).toBe('D/D Lance Soldier');
    expect(action.targetOriginZone).toBe('deck');
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate comma destroy shorthand as the same destroy action', () => {
    const [action] = parseCombo('Activate [Card A], destroy [Card B].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Destroy']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate comma banish shorthand as the same banish action', () => {
    const [action] = parseCombo('Activate [Card A], banish [Card B].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Banish']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate comma return shorthand as the same return action', () => {
    const [action] = parseCombo('Activate [Card A], return [Card B] to the hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Return']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('hand');
  });

  it('parses activate comma set shorthand as the same set action', () => {
    const [action] = parseCombo('Activate [Card A], set [Card B].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Set']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
  });

  it('parses activate destroy with multiple targets', () => {
    const [action] = parseCombo('Activate [Orthros] to destroy [Marksman King Tell] and [Orthros]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Destroy']);
    expect(action.sourceCard).toBe('Orthros');
    expect(action.targetCard).toBe('Marksman King Tell');
    expect(action.targetCards).toEqual(['Marksman King Tell', 'Orthros']);
  });

  it('parses activate in the gy to set from the deck', () => {
    const [action] = parseCombo('Activate [hero fountain] in the gy to set [mask change] from the deck');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Set']);
    expect(action.sourceCard).toBe('hero fountain');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('mask change');
    expect(action.targetZone).toBe('deck');
  });

  it('parses activate in the gy to set itself with an unbracketed source card', () => {
    const [action] = parseCombo('Activate tales of the white in the gy to set itself');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Set']);
    expect(action.sourceCard).toBe('tales of the white');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('tales of the white');
    expect(action.targetZone).toBe('gy');
  });

  it('parses normal summon into activate it to special summon as one compound step', () => {
    const [action] = parseCombo('Normal Summon [Card A], activate it to special summon [Card B] from deck');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('deck');
  });

  it('parses normal summon into activate its effect to special summon using shorthand', () => {
    const [action] = parseCombo('NS [vengeance], activate its effect to SS [alucard].');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('vengeance');
    expect(action.targetCard).toBe('alucard');
  });

  it('parses normal summon and activate it to special summon using shorthand', () => {
    const [action] = parseCombo('ns [Fallen of the White] and activate it to ss [Incredible Ecclesia]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('Fallen of the White');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Incredible Ecclesia');
  });

  it('parses normal summon and activate it to banish from deck', () => {
    const [action] = parseCombo('Ns [Cocatorium] and activate it to banish [Mercourier] from the deck.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Banish']);
    expect(action.sourceCard).toBe('Cocatorium');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Mercourier');
    expect(action.targetZone).toBe('deck');
  });

  it('parses normal summon into tribute itself then special summon from deck', () => {
    const [action] = parseCombo('Ns [Incredible Ecclesia, the Virtuous] and activate it to tribute itself to ss [Fallen of the White Dragon] from the deck');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Tribute', 'Special Summon']);
    expect(action.sourceCard).toBe('Incredible Ecclesia, the Virtuous');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Incredible Ecclesia, the Virtuous');
    expect(action.followUpCard).toBe('Fallen of the White Dragon');
    expect(action.followUpZone).toBe('deck');
  });

  it.each([
    ['NS [Card A] and activate it to destroy [Card B]', 'Destroy', 'Card B', undefined],
    ['NS [Card A] and activate it to return [Card B] to the hand', 'Return', 'Card B', 'hand'],
    ['NS [Card A] and activate it to set [Card B] from the deck', 'Set', 'Card B', 'deck'],
    ['NS [Card A] and activate it to negate [Card B]', 'Negate', 'Card B', undefined],
    ['NS [Card A] and activate it to tribute [Card B]', 'Tribute', 'Card B', undefined],
    ['NS [Card A] and activate it to target [Card B] in the gy', 'Target', 'Card B', 'gy'],
    ['NS [Card A] and activate it to detach [Card B]', 'Detach', 'Card B', undefined],
    ['NS [Card A] and activate it to reveal [Card B]', 'Reveal', 'Card B', undefined],
    ['NS [Card A] and activate it to draw 2 cards', 'Draw', '2 cards', 'hand'],
  ])('parses normal summon into the shared activate effect path: %s', (line, effectLabel, targetCard, targetZone) => {
    const [action] = parseCombo(line);

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', effectLabel]);
    expect(action.sourceCard).toBe('Card A');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe(targetCard);
    expect(action.targetZone).toBe(targetZone);
  });

  it('parses normal summon into activate its effect to add to hand', () => {
    const [action] = parseCombo('NS [Stratos] activate its effect to add [Miracle Ejector] to Hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Stratos');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Miracle Ejector');
    expect(action.targetZone).toBe('hand');
  });

  it('parses normal summon add to hand shorthand as the same compound step', () => {
    const [action] = parseCombo('NS [Stratos] add [Miracle Ejector] to Hand.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Stratos');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Miracle Ejector');
    expect(action.targetZone).toBe('hand');
  });

  it('parses normal summon and activate its effect to add to the hand wording', () => {
    const [action] = parseCombo('ns [silvy] and activate its effect to add [tales of the white] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('silvy');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('tales of the white');
    expect(action.targetZone).toBe('hand');
  });

  it('parses normal summon into activate send to the graveyard as one compound step', () => {
    const [action] = parseCombo('NS [vyon] and activate its effect to send [shadow mist] to the gy');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('vyon');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('shadow mist');
    expect(action.targetZone).toBe('gy');
  });

  it('parses normal summon plain send to the graveyard as the same compound step', () => {
    const [action] = parseCombo('NS [vyon] and send [shadow mist] to the gy.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('vyon');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('shadow mist');
    expect(action.targetZone).toBe('gy');
  });

  it('parses normal summon use its effect send to the graveyard as the same compound step', () => {
    const [action] = parseCombo('NS [vyon] and use its effect to send [shadow mist] to the gy.');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Normal Summon');
    expect(action.labels).toEqual(['Normal Summon', 'Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('vyon');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('shadow mist');
    expect(action.targetZone).toBe('gy');
  });

  it('parses special summon into activate it to send to the graveyard as one compound step', () => {
    const [action] = parseCombo('Special Summon [Card A] from hand and activate it to send [Card B] to the Graveyard');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Special Summon', 'Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Card B');
    expect(action.targetZone).toBe('gy');
  });

  it('parses add to hand into activate effect to special summon itself with hand source', () => {
    const [action] = parseCombo('Add [Card A] to hand and activate its effect to special summon itself');

    expect(action.type).toBe('summon');
    expect(action.labels).toEqual(['Add to Hand', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('Card A');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Card A');
  });

  it('parses discard into activate effect to special summon itself with shorthand', () => {
    const [action] = parseCombo('Discard [Lurrie] activate its effect to SS itself.');

    expect(action.type).toBe('summon');
    expect(action.labels).toEqual(['Discard', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('Lurrie');
    expect(action.targetCard).toBe('Lurrie');
  });

  it('parses return to hand into activate effect to special summon itself', () => {
    const [action] = parseCombo('Return [Lurrie] to hand and activate its effect to SS itself.');

    expect(action.type).toBe('summon');
    expect(action.labels).toEqual(['Return', 'Activate', 'Special Summon']);
    expect(action.sourceCard).toBe('Lurrie');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Lurrie');
  });

  it('parses tribute to summon as a one-step cost into result action', () => {
    const [action] = parseCombo('Tribute [Flame wingman] to summon [rock]');

    expect(action.type).toBe('tribute');
    expect(action.label).toBe('Tribute');
    expect(action.labels).toEqual(['Tribute', 'Summon']);
    expect(action.sourceCard).toBe('Flame wingman');
    expect(action.targetCard).toBe('rock');
  });

  it('parses tribute target in gy and special summon it as one step', () => {
    const [action] = parseCombo('Tribute [Voltic thunder] target [Stratos] in the GY and SS it.');

    expect(action.type).toBe('tribute');
    expect(action.label).toBe('Tribute');
    expect(action.labels).toEqual(['Tribute', 'Target', 'Special Summon']);
    expect(action.sourceCard).toBe('Voltic thunder');
    expect(action.targetCard).toBe('Stratos');
    expect(action.targetZone).toBe('gy');
  });
});

describe('parseCombo banished zone syntax', () => {
  it('recognizes source cards from banishment', () => {
    const [action] = parseCombo('Special Summon [Card A] from banishment');

    expect(action.sourceZone).toBe('banished');
  });

  it('recognizes source cards from the banished zone', () => {
    const [action] = parseCombo('Special Summon [Card A] from banished zone');

    expect(action.sourceZone).toBe('banished');
  });
});

describe('parseCombo chain link syntax', () => {
  it('parses explicit Chain Link prefixes', () => {
    const [action] = parseCombo('Chain Link 1 Activate [Card A] to set [Card B]');

    expect(action.chainLink).toBe(1);
    expect(action.labels).toEqual(['Activate', 'Set']);
  });

  it('parses CL shorthand prefixes', () => {
    const [action] = parseCombo('CL2 Activate [Card A] to destroy [Card B]');

    expect(action.chainLink).toBe(2);
    expect(action.labels).toEqual(['Activate', 'Destroy']);
  });

  it('parses CL shorthand prefixes with bare-name activate destroy syntax', () => {
    const [action] = parseCombo('CL2 Activate Moa to destroy Mu rcielago');

    expect(action.chainLink).toBe(2);
    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Destroy']);
    expect(action.sourceCard).toBe('Moa');
    expect(action.targetCard).toBe('Mu rcielago');
  });

  it('parses CL activate in gy to send to gy syntax', () => {
    const [action] = parseCombo('CL1 Activate [Marksman King Tell] in the gy to send [Necro Slime] to the gy');

    expect(action.chainLink).toBe(1);
    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Send to GY']);
    expect(action.sourceCard).toBe('Marksman King Tell');
    expect(action.sourceZone).toBe('gy');
    expect(action.targetCard).toBe('Necro Slime');
    expect(action.targetZone).toBe('gy');
  });

  it('parses CL activate fusion summon using syntax', () => {
    const [action] = parseCombo('CL1 Activate [the hallowed Azamina] to fusion summon [Azamina ilia] using [sinful spoils of the white forest]');

    expect(action.chainLink).toBe(1);
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('the hallowed Azamina');
    expect(action.sourceCards).toEqual(['sinful spoils of the white forest']);
    expect(action.targetCard).toBe('Azamina ilia');
  });

  it('parses CL activate fusion summon using syntax without brackets', () => {
    const [action] = parseCombo('CL1 Activate the hallowed Azamina to fusion summon Azamina ilia using Sinful spoils of the white forest.');

    expect(action.chainLink).toBe(1);
    expect(action.labels).toEqual(['Activate', 'Fusion Summon']);
    expect(action.sourceCard).toBe('the hallowed Azamina');
    expect(action.sourceCards).toEqual(['Sinful spoils of the white forest']);
    expect(action.targetCard).toBe('Azamina ilia');
  });

  it('does not infer Chain Link 2 after an explicit Chain Link 1', () => {
    const actions = parseCombo([
      'Chain Link 1 Activate [Card A] to set [Card B]',
      'Activate [Card C] to destroy [Card D]',
    ].join('\n'));

    expect(actions[0].chainLink).toBe(1);
    expect(actions[1].chainLink).toBeUndefined();
  });

  it('only assigns chain links to explicitly marked steps', () => {
    const actions = parseCombo([
      'CL1 Activate [wonder driver] target [miracle fusion] from GY and set it.',
      'CL2 Activate [dusk crow] to add [hero furnace] from the deck.',
      'Activate [hero furnace] to add [mask change] to hand, then discard [hero furnace].',
    ].join('\n'));

    expect(actions[0].chainLink).toBe(1);
    expect(actions[1].chainLink).toBe(2);
    expect(actions[2].chainLink).toBeUndefined();
  });
});

describe('parseCombo phase syntax', () => {
  it.each([
    'EP CL1 Activate [Lubellion] to discard [Blazing Cartesia]',
    'CL1 EP Activate [Lubellion] to discard [Blazing Cartesia]',
  ])('parses combined phase and chain-link prefixes in either order: %s', (line) => {
    const [action] = parseCombo(line);

    expect(action.phase).toBe('End Phase');
    expect(action.chainLink).toBe(1);
    expect(action.chainLinkExplicit).toBe(true);
    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Discard']);
    expect(action.sourceCard).toBe('Lubellion');
    expect(action.targetCard).toBe('Blazing Cartesia');
    expect(action.targetZone).toBe('gy');
  });

  it('parses draw phase wording as phase metadata', () => {
    const [action] = parseCombo('Draw Phase activate [Card A].');

    expect(action.phase).toBe('Draw Phase');
  });

  it('parses BP shorthand as battle phase metadata', () => {
    const [action] = parseCombo('BP activate [Card A].');

    expect(action.phase).toBe('Battle Phase');
  });

  it('parses during the battle phase phrasing as phase metadata', () => {
    const [action] = parseCombo('During the Battle Phase, activate [Card A].');

    expect(action.phase).toBe('Battle Phase');
  });

  it('parses MP1 shorthand as main phase 1 metadata', () => {
    const [action] = parseCombo('MP1 normal summon [Card A].');

    expect(action.phase).toBe('Main Phase 1');
  });
});

describe('parseCombo summon shorthand syntax', () => {
  it('parses NS as normal summon', () => {
    const [action] = parseCombo('NS [Card A]');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Normal Summon');
    expect(action.sourceCard).toBe('Card A');
    expect(action.sourceZone).toBe('hand');
  });

  it('parses SS as special summon', () => {
    const [action] = parseCombo('SS [Card A] from hand');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.sourceCard).toBe('Card A');
  });

  it('parses SS of two cards with and syntax', () => {
    const [action] = parseCombo('SS [Cupsy☆Yummy] and [Cooky☆Yummy].');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('Cupsy☆Yummy');
    expect(action.targetCards).toEqual(['Cupsy☆Yummy', 'Cooky☆Yummy']);
  });

  it('parses SS of two cards with comma syntax', () => {
    const [action] = parseCombo('SS [Cupsy☆Yummy], [Cooky☆Yummy]');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.targetOnly).toBe(true);
    expect(action.targetCard).toBe('Cupsy☆Yummy');
    expect(action.targetCards).toEqual(['Cupsy☆Yummy', 'Cooky☆Yummy']);
  });

  it('does not misread summon then send phrasing as a multi-summon step', () => {
    const [action] = parseCombo('Special Summon [Diabellze the White Witch] from hand and send [Susurrus of the Sinful Spoils] to the Graveyard');

    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Special Summon', 'Send to GY']);
    expect(action.sourceCard).toBe('Diabellze the White Witch');
    expect(action.sourceZone).toBe('hand');
    expect(action.targetCard).toBe('Susurrus of the Sinful Spoils');
  });

  it('parses pendulum summon with multiple targets', () => {
    const [action] = parseCombo('Pendulum summon [D/D Gryphon] and [Orthros]');

    expect(action.type).toBe('pendulum');
    expect(action.label).toBe('Pendulum Summon');
    expect(action.targetCard).toBe('D/D Gryphon');
    expect(action.targetCards).toEqual(['D/D Gryphon', 'Orthros']);
    expect(action.targetOnly).toBe(true);
  });

  it('parses pendulum summon with more than three targets for cascade rendering', () => {
    const [action] = parseCombo('Pendulum summon [D/D Gryphon], [Orthros], [Kepler] and [Copernicus]');

    expect(action.type).toBe('pendulum');
    expect(action.targetCards).toEqual(['D/D Gryphon', 'Orthros', 'Kepler', 'Copernicus']);
    expect(action.targetOnly).toBe(true);
  });

  it('parses ss by banishing multiple cards from the gy', () => {
    const [action] = parseCombo('ss [diabellstar vengeance] by banishing [Filia diabell] and [curse of diabell] from the gy');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Banish', 'Special Summon']);
    expect(action.sourceCard).toBe('diabellstar vengeance');
    expect(action.sourceCards).toEqual(['Filia diabell', 'curse of diabell']);
    expect(action.sourceZones).toEqual(['gy', 'gy']);
    expect(action.targetCard).toBe('diabellstar vengeance');
  });

  it('parses special summon by banishing a card without an explicit zone', () => {
    const [action] = parseCombo('Special summon [dark magician of destruction] by banishing [Diabellstar]');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Banish', 'Special Summon']);
    expect(action.sourceCard).toBe('dark magician of destruction');
    expect(action.sourceCards).toEqual(['Diabellstar']);
    expect(action.sourceZones).toEqual([undefined]);
    expect(action.targetCard).toBe('dark magician of destruction');
  });

  it('parses ss by sending a card to the gy', () => {
    const [action] = parseCombo('ss [Diabellstar] by sending [silvy] to the gy');

    expect(action.type).toBe('summon');
    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Send to GY', 'Special Summon']);
    expect(action.sourceCard).toBe('Diabellstar');
    expect(action.sourceCards).toEqual(['silvy']);
    expect(action.sourceZones).toEqual(['gy']);
    expect(action.targetCard).toBe('Diabellstar');
  });

  it('parses bare-name ss into activate its effect to add to hand', () => {
    const [action] = parseCombo('ss elzette, activate its effect to add [silvy] to the hand');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Special Summon');
    expect(action.labels).toEqual(['Special Summon', 'Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('elzette');
    expect(action.targetCard).toBe('silvy');
    expect(action.targetZone).toBe('hand');
  });

  it('parses FS as fusion summon', () => {
    const [action] = parseCombo('FS [Card A]');

    expect(action.type).toBe('fusion');
    expect(action.label).toBe('Fusion Summon');
    expect(action.sourceCard).toBe('Card A');
  });

  it('parses bold card references as card names', () => {
    const [action] = parseCombo('Activate **Miracle Ejector** to add **EN Shuffle** to hand.');

    expect(action.type).toBe('activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand']);
    expect(action.sourceCard).toBe('Miracle Ejector');
    expect(action.targetCard).toBe('EN Shuffle');
  });
});
