import { describe, expect, it } from 'vitest';

import { parseCombo } from '@/lib/comboParser';

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

  it('parses activate to special summon with optional source zone', () => {
    const [action] = parseCombo('Activate [Card A] to special summon [Card B] from the GY');

    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.targetZone).toBe('gy');
  });

  it('parses activate to special summon from banished zone', () => {
    const [action] = parseCombo('Activate [Card A] to special summon [Card B] from banished zone');

    expect(action.labels).toEqual(['Activate', 'Special Summon']);
    expect(action.targetZone).toBe('banished');
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

  it('parses activate to add then discard as one compound step', () => {
    const [action] = parseCombo('Activate [furnace] to add [mask change] to hand, then discard [furnace]');

    expect(action.type).toBe('activate');
    expect(action.label).toBe('Activate');
    expect(action.labels).toEqual(['Activate', 'Add to Hand', 'Discard']);
    expect(action.sourceCard).toBe('furnace');
    expect(action.targetCard).toBe('mask change');
    expect(action.targetZone).toBe('hand');
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

  it('auto-increments consecutive chain activations when the next one is omitted', () => {
    const actions = parseCombo([
      'Chain Link 1 Activate [Card A] to set [Card B]',
      'Activate [Card C] to destroy [Card D]',
    ].join('\n'));

    expect(actions[0].chainLink).toBe(1);
    expect(actions[1].chainLink).toBe(2);
  });

  it('does not keep auto-incrementing chain links past the immediate omitted follow-up', () => {
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
