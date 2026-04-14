export type CardZone = 'hand' | 'gy' | 'deck' | 'extra-deck' | 'banished';
export type ScaleSide = 'left' | 'right';
export type ComboPhase = 'Draw Phase' | 'Main Phase 1' | 'Battle Phase' | 'Main Phase 2' | 'End Phase';

export interface ComboAction {
  type: 'summon' | 'ritual' | 'send-gy' | 'activate' | 'target' | 'search' | 'banish' | 'draw' | 'set' | 'tribute' | 'link' | 'xyz' | 'synchro' | 'fusion' | 'pendulum' | 'scale' | 'return' | 'negate' | 'destroy' | 'discard' | 'detach' | 'reveal' | 'continuous' | 'generic';
  label: string;
  labels?: string[];
  chainLink?: number;
  chainLinkExplicit?: boolean;
  phase?: ComboPhase;
  sourceCard: string;
  sourceZone?: CardZone;
  sourceCards?: string[];
  sourceZones?: Array<CardZone | undefined>;
  scaleSides?: ScaleSide[];
  targetCard?: string;
  targetZone?: CardZone;
  targetCards?: string[];
  targetZones?: Array<CardZone | undefined>;
  targetOriginZone?: CardZone;
  followUpCard?: string;
  followUpZone?: CardZone;
  followUpCards?: string[];
  followUpZones?: Array<CardZone | undefined>;
  targetOnly?: boolean;
  raw: string;
}

function normalizeZone(zone?: string): CardZone | undefined {
  if (!zone) return undefined;
  const normalized = zone.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized === 'hand') return 'hand';
  if (normalized === 'gy' || normalized === 'graveyard') return 'gy';
  if (normalized === 'deck') return 'deck';
  if (normalized === 'extra deck') return 'extra-deck';
  if (normalized === 'banished' || normalized === 'banished zone' || normalized === 'banishment') return 'banished';
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCardRefs(text: string): string[] {
  return [...text.matchAll(/\[(.+?)\]/g)].map((match) => match[1]);
}

function findCardZone(text: string, cardName: string, occurrence = 1): CardZone | undefined {
  const regex = new RegExp(
    `\\[${escapeRegExp(cardName)}\\](?:\\s+(?:from|in)\\s+(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?`,
    'ig',
  );

  let seen = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    seen += 1;
    if (seen === occurrence) {
      return normalizeZone(match[1]);
    }
  }

  return undefined;
}

function repeatZone(zone: CardZone | undefined, count: number): Array<CardZone | undefined> {
  return Array.from({ length: count }, () => zone);
}

function inferDefaultSourceZone(label: string, sourceZone: CardZone | undefined): CardZone | undefined {
  if (sourceZone) return sourceZone;
  if (label === 'Normal Summon') return 'hand';
  return sourceZone;
}

function detectPhase(text: string): ComboPhase | undefined {
  const phasePatterns: Array<{ phase: ComboPhase; pattern: RegExp }> = [
    { phase: 'Draw Phase', pattern: /\b(?:during\s+the\s+)?(?:draw\s+phase|dp)\b/i },
    { phase: 'Main Phase 1', pattern: /\b(?:during\s+the\s+)?(?:main\s+phase\s+1|mp1)\b/i },
    { phase: 'Battle Phase', pattern: /\b(?:during\s+the\s+)?(?:battle\s+phase|bp)\b/i },
    { phase: 'Main Phase 2', pattern: /\b(?:during\s+the\s+)?(?:main\s+phase\s+2|mp2)\b/i },
    { phase: 'End Phase', pattern: /\b(?:during\s+the\s+)?(?:end\s+phase|ep)\b/i },
  ];

  return phasePatterns.find(({ pattern }) => pattern.test(text))?.phase;
}

function normalizeCardReferenceSyntax(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '[$1]');
}

function parseMultiTargetStep(trimmed: string): ComboAction | null {
  const sourceDrivenPatterns: Array<{
    pattern: RegExp;
    type: ComboAction['type'];
    label: string;
    zoneFrom?: (rawZone?: string) => CardZone | undefined;
  }> = [
    { pattern: /^\[(.+?)\]\s+negates?\s+(.+)$/i, type: 'negate', label: 'Negate' },
    { pattern: /^\[(.+?)\]\s+destroys?\s+(.+)$/i, type: 'destroy', label: 'Destroy' },
    { pattern: /^\[(.+?)\]\s+banish(?:es)?\s+(.+)$/i, type: 'banish', label: 'Banish' },
    {
      pattern: /^\[(.+?)\]\s+sends?\s+(.+)\s+to\s+the?\s*(gy|graveyard)$/i,
      type: 'send-gy',
      label: 'Send to GY',
      zoneFrom: (rawZone) => normalizeZone(rawZone),
    },
  ];

  for (const { pattern, type, label, zoneFrom } of sourceDrivenPatterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const sourceCard = match[1];
    const targetsText = match[2];
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length <= 1) continue;
    const zone = zoneFrom ? zoneFrom(match[3]) : undefined;

    return {
      type,
      label,
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: targetCards[0],
      targetCards,
      targetZone: zone ?? findCardZone(trimmed, targetCards[0]),
      targetZones: zone ? repeatZone(zone, targetCards.length) : targetCards.map((cardName) => findCardZone(trimmed, cardName)),
      raw: trimmed,
    };
  }

  const sendMatch = trimmed.match(/^send\s+(.+)\s+to\s+the?\s*(gy|graveyard)(?:\s+(?:with|using|from|by)\s+\[(.+?)\])?$/i);
  if (sendMatch) {
    const [, targetsText, rawZone, sourceCard] = sendMatch;
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length > 1) {
      const zone = normalizeZone(rawZone);
      return {
        type: 'send-gy',
        label: 'Send to GY',
        sourceCard: sourceCard || targetCards[0],
        sourceZone: sourceCard ? findCardZone(trimmed, sourceCard) : undefined,
        targetCard: targetCards[0],
        targetCards,
        targetZone: zone,
        targetZones: repeatZone(zone, targetCards.length),
        raw: trimmed,
      };
    }
  }

  const returnMatch = trimmed.match(/^return\s+(.+)\s+to\s+(hand|deck|extra\s+deck)$/i);
  if (returnMatch) {
    const [, targetsText, rawZone] = returnMatch;
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length > 1) {
      const zone = normalizeZone(rawZone);
      return {
        type: 'return',
        label: 'Return',
        sourceCard: targetCards[0],
        targetCard: targetCards[0],
        targetCards,
        targetZone: zone,
        targetZones: repeatZone(zone, targetCards.length),
        raw: trimmed,
      };
    }
  }

  const tributeMatch = trimmed.match(/^tribute\s+(.+)$/i);
  if (tributeMatch) {
    if (/\bto\s+ritual\s+summon\b/i.test(trimmed)) return null;
    const targetCards = extractCardRefs(tributeMatch[1]);
    if (targetCards.length > 1) {
      return {
        type: 'tribute',
        label: 'Tribute',
        sourceCard: targetCards[0],
        targetCard: targetCards[0],
        targetCards,
        raw: trimmed,
      };
    }
  }

  return null;
}

function parseContinuousSpellTrapStep(trimmed: string): ComboAction | null {
  const zonePattern = '(?:continuous|continous)\\s+spell\\s*(?:and|&)\\s*trap\\s+zone';

  const sourceDrivenMatch = trimmed.match(
    new RegExp(`^\\[(.+?)\\]\\s+puts?\\s+\\[(.+?)\\]\\s+in\\s+the\\s+${zonePattern}[.!]?$`, 'i'),
  );

  if (sourceDrivenMatch) {
    const [, sourceCard, targetCard] = sourceDrivenMatch;
    return {
      type: 'continuous',
      label: 'Continuous Spell & Trap',
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      raw: trimmed,
    };
  }

  const directMatch = trimmed.match(
    new RegExp(`^put\\s+\\[(.+?)\\]\\s+in\\s+the\\s+${zonePattern}[.!]?$`, 'i'),
  );

  if (directMatch) {
    const [, targetCard] = directMatch;
    return {
      type: 'continuous',
      label: 'Continuous Spell & Trap',
      sourceCard: targetCard,
      targetCard,
      targetOnly: true,
      raw: trimmed,
    };
  }

  return null;
}

const ACTION_PATTERNS: { pattern: RegExp; type: ComboAction['type']; label: string }[] = [
  // Extra deck summons (must be before generic summon)
  { pattern: /fuse\s+\[(.+?)\](?:\s+(?:from|in)\s+(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?\s+and\s+\[(.+?)\](?:\s+(?:from|in)\s+(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?\s+into\s+\[(.+?)\](?:\s+(?:from|in)\s+(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?/i, type: 'fusion', label: 'Fusion Summon' },
  { pattern: /link\s+summon\s+\[(.+?)\]/i, type: 'link', label: 'Link Summon' },
  { pattern: /xyz\s+summon\s+\[(.+?)\]\s+using\s+\[(.+?)\]\s+and\s+\[(.+?)\]/i, type: 'xyz', label: 'Xyz Summon' },
  { pattern: /overlay\s+\[(.+?)\]\s+and\s+\[(.+?)\]\s+into\s+\[(.+?)\]/i, type: 'xyz', label: 'Xyz Summon' },
  { pattern: /xyz\s+summon\s+\[(.+?)\]/i, type: 'xyz', label: 'Xyz Summon' },
  { pattern: /synchro\s+summon\s+\[(.+?)\]\s+using\s+\[(.+?)\]\s+and\s+\[(.+?)\]/i, type: 'synchro', label: 'Synchro Summon' },
  { pattern: /synchro\s+summon\s+\[(.+?)\]/i, type: 'synchro', label: 'Synchro Summon' },
  { pattern: /fusion\s+summon\s+\[(.+?)\]/i, type: 'fusion', label: 'Fusion Summon' },
  { pattern: /pendulum\s+summon\s+\[(.+?)\]/i, type: 'pendulum', label: 'Pendulum Summon' },
  { pattern: /scale\s+\[(.+?)\]\s+and\s+\[(.+?)\]/i, type: 'scale', label: 'Scale' },
  { pattern: /scale\s+\[(.+?)\](?:\s+to\s+the\s+(left|right))?/i, type: 'scale', label: 'Scale' },
  { pattern: /put\s+\[(.+?)\]\s+on\s+the\s+(left|right)\s+scale/i, type: 'scale', label: 'Scale' },
  { pattern: /tribute\s+(?:summon\s+)?\[(.+?)\]/i, type: 'tribute', label: 'Tribute' },

  // Summon patterns
  { pattern: /(?:normal|flip)\s+summon\s+\[(.+?)\]/i, type: 'summon', label: 'Normal Summon' },
  { pattern: /special\s+summon\s+\[(.+?)\](?:\s+(?:from|in)\s+\w+)?(?:.*?(?:and|,|then)\s+send\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard))?/i, type: 'summon', label: 'Special Summon' },
  { pattern: /(?:special\s+)?summon\s+\[(.+?)\]/i, type: 'summon', label: 'Summon' },
  
  // Send to GY
  { pattern: /\[(.+?)\]\s+sends?\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard)/i, type: 'send-gy', label: 'Send to GY' },
  { pattern: /send\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard)(?:\s+(?:with|using|from|by)\s+\[(.+?)\])?/i, type: 'send-gy', label: 'Send to GY' },

  // Activate
  { pattern: /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:.*?(?:targeting|to target|on)\s+\[(.+?)\])?/i, type: 'activate', label: 'Activate' },
  { pattern: /\[(.+?)\]\s+targets\s+\[(.+?)\]/i, type: 'activate', label: 'Activate' },
  { pattern: /target\s+\[(.+?)\]/i, type: 'activate', label: 'Target' },
  { pattern: /\[(.+?)\]\s+(?:effect\s+)?activates?/i, type: 'activate', label: 'Activate' },

  // Search
  { pattern: /\[(.+?)\]\s+(?:searches|adds)\s+\[(.+?)\]/i, type: 'search', label: 'Search' },
  { pattern: /search\s+\[(.+?)\](?:\s+(?:with|using|from|by)\s+\[(.+?)\])?/i, type: 'search', label: 'Search' },
  { pattern: /add\s+\[(.+?)\]\s+(?:to\s+(?:your\s+)?hand|from\s+(?:deck|gy|graveyard|banished(?:\s+zone)?|banishment))/i, type: 'search', label: 'Add to Hand' },

  // Banish
  { pattern: /banish\s+\[(.+?)\](?:\s+(?:with|using|from|by)\s+\[(.+?)\])?/i, type: 'banish', label: 'Banish' },
  { pattern: /\[(.+?)\]\s+banish(?:es)?\s+\[(.+?)\]/i, type: 'banish', label: 'Banish' },

  // Discard
  { pattern: /discard\s+\[(.+?)\]/i, type: 'discard', label: 'Discard' },

  // Detach
  { pattern: /detach\s+\[(.+?)\]/i, type: 'detach', label: 'Detach' },

  // Set
  { pattern: /set\s+\[(.+?)\]/i, type: 'set', label: 'Set' },

  // Destroy
  { pattern: /\[(.+?)\]\s+destroys?\s+\[(.+?)\]/i, type: 'destroy', label: 'Destroy' },
  { pattern: /destroy\s+\[(.+?)\]/i, type: 'destroy', label: 'Destroy' },

  // Negate
  { pattern: /\[(.+?)\]\s+negates?\s+\[(.+?)\]/i, type: 'negate', label: 'Negate' },

  // Return
  { pattern: /return\s+\[(.+?)\]\s+to\s+(?:hand|deck|extra\s+deck)/i, type: 'return', label: 'Return' },

  // Draw
  { pattern: /draw\s+(\d+)\s+cards?/i, type: 'draw', label: 'Draw' },

];

function parseContextualStep(trimmed: string): ComboAction | null {
  const cardRefs = [...trimmed.matchAll(/\[(.+?)\]/g)].map((match) => match[1]);
  if (cardRefs.length === 0) return null;

  const anchorCard = cardRefs[0];
  const normalized = trimmed.toLowerCase();
  const labels: string[] = [];

  if (/\badd\b/.test(normalized) && /\bto\s+(?:your\s+)?hand\b/.test(normalized)) labels.push('Add to Hand');
  if (/\bbanish\b/.test(normalized)) labels.push('Banish');
  if (/\bdiscard\b/.test(normalized)) labels.push('Discard');
  if (/\bdetach\b/.test(normalized)) labels.push('Detach');
  if (/\bdestroy\b/.test(normalized)) labels.push('Destroy');
  if (/\breturn\b/.test(normalized)) labels.push('Return');
  if (/\bset\b/.test(normalized)) labels.push('Set');
  if (/\btribute\b/.test(normalized)) labels.push('Tribute');
  if (/\bactivate\b/.test(normalized) && /\bits?\s+effects?\b/.test(normalized)) labels.push('Activate');
  if (/\bspecial\s+summon\b/.test(normalized) && /\bitself\b/.test(normalized)) labels.push('Special Summon');

  if (labels.length < 2) return null;

  return {
    type: labels.includes('Special Summon') ? 'summon' : labels.includes('Activate') ? 'activate' : 'generic',
    label: labels[0],
    labels,
    sourceCard: anchorCard,
    sourceZone:
      ((labels.includes('Add to Hand') || labels.includes('Return')) && labels.includes('Special Summon'))
        ? 'hand'
        : findCardZone(trimmed, anchorCard),
    targetCard: labels.includes('Special Summon') ? anchorCard : undefined,
    targetZone: labels.includes('Special Summon') ? findCardZone(trimmed, anchorCard, 2) : undefined,
    raw: trimmed,
  };
}

function stripChainLinkPrefix(line: string): { text: string; chainLink?: number } {
  const match = line.match(/^(?:chain\s*link|cl)\s*(\d+)\s+(.*)$/i);
  if (!match) return { text: line };

  return {
    text: match[2].trim(),
    chainLink: Number(match[1]),
  };
}

function expandSummonShorthand(line: string): string {
  return line
    .replace(/\bNS\b(?=\s+\[)/gi, 'Normal Summon')
    .replace(/\bSS\b(?=\s+(?:\[|itself\b|it\b))/gi, 'Special Summon')
    .replace(/\bFS\b(?=\s+\[)/gi, 'Fusion Summon');
}

function parseActivateEffectStep(trimmed: string): ComboAction | null {
  const activateOnlyMatch = trimmed.match(
    /^activate\s+(?:the\s+effect\s+of\s+)?\[([^\]]+)\][.!]?$/i,
  );

  if (activateOnlyMatch) {
    const [, sourceCard] = activateOnlyMatch;

    return {
      type: 'activate',
      label: 'Activate',
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      raw: trimmed,
    };
  }

  const activateMultiBanishMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\]\s+to\s+banish\s+(.+)\s+from\s+(?:the\s+)?(gy|graveyard|hand|deck|extra\s+deck|banished(?:\s+zone)?|banishment)[.!]?$/i,
  );

  if (activateMultiBanishMatch) {
    const [, sourceCard, targetsText, rawTargetZone] = activateMultiBanishMatch;
    const targetCards = extractCardRefs(targetsText);

    if (targetCards.length > 1) {
      const targetZone = normalizeZone(rawTargetZone);
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Banish'],
        sourceCard,
        sourceZone: findCardZone(trimmed, sourceCard),
        targetCard: targetCards[0],
        targetCards,
        targetZone,
        targetZones: repeatZone(targetZone, targetCards.length),
        raw: trimmed,
      };
    }
  }

  const activateFusionMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?fuse\s+(.+)\s+into\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateFusionMatch) {
    const [, sourceCard, materialsText, targetCard, rawTargetZone] = activateFusionMatch;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Fusion Summon'],
        sourceCard,
        sourceZone: findCardZone(trimmed, sourceCard),
        sourceCards,
        sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const activateShuffleSelfThenSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?shuffle\s+(?:itself|\[(.+?)\])\s+back\s+to\s+(?:the\s+)?deck\s+(?:to|and)\s+special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateShuffleSelfThenSummonMatch) {
    const [, sourceCard, explicitReturnCard, followUpCard, rawFollowUpZone] = activateShuffleSelfThenSummonMatch;
    const returnTargetCard = explicitReturnCard || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Return', 'Special Summon'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: returnTargetCard,
      targetZone: 'deck',
      followUpCard,
      followUpZone: rawFollowUpZone ? normalizeZone(rawFollowUpZone) : findCardZone(trimmed, followUpCard),
      raw: trimmed,
    };
  }

  const activatePrimaryThenSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?(?:(return)\s+(.+)\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)|(send)\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)|(destroy)\s+\[(.+?)\]|(banish)\s+\[(.+?)\]|(set)\s+\[(.+?)\])\s*,?\s*(?:and\s+)?special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activatePrimaryThenSummonMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      returnEffect,
      returnTargetsText,
      returnZone,
      sendEffect,
      sendTarget,
      sendZone,
      destroyEffect,
      destroyTarget,
      banishEffect,
      banishTarget,
      setEffect,
      setTarget,
      followUpCard,
      rawFollowUpZone,
    ] = activatePrimaryThenSummonMatch;

    const primaryEffect = [
      returnEffect && (() => {
        const targetCards = extractCardRefs(returnTargetsText);
        const targetZone = normalizeZone(returnZone);
        return {
          label: 'Return',
          targetCard: targetCards[0],
          targetCards,
          targetZone,
          targetZones: repeatZone(targetZone, targetCards.length),
        };
      })(),
      sendEffect && { label: 'Send to GY', targetCard: sendTarget, targetZone: normalizeZone(sendZone) },
      destroyEffect && { label: 'Destroy', targetCard: destroyTarget, targetZone: findCardZone(trimmed, destroyTarget) },
      banishEffect && { label: 'Banish', targetCard: banishTarget, targetZone: findCardZone(trimmed, banishTarget) },
      setEffect && { label: 'Set', targetCard: setTarget, targetZone: findCardZone(trimmed, setTarget) },
    ].find(Boolean);

    if (primaryEffect) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', primaryEffect.label, 'Special Summon'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard: primaryEffect.targetCard,
        targetCards: 'targetCards' in primaryEffect ? primaryEffect.targetCards : undefined,
        targetZone: primaryEffect.targetZone,
        targetZones: 'targetZones' in primaryEffect ? primaryEffect.targetZones : undefined,
        followUpCard,
        followUpZone: rawFollowUpZone ? normalizeZone(rawFollowUpZone) : findCardZone(trimmed, followUpCard),
        raw: trimmed,
      };
    }
  }

  const activateBanishThenSelfSummonMatch = trimmed.match(
    /activate\s+\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+banish\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:and|to)\s+special\s+summon\s+(?:itself|\[(.+?)\])[.!]?$/i,
  );

  if (activateBanishThenSelfSummonMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetZone, explicitFollowUpCard] = activateBanishThenSelfSummonMatch;
    const followUpCard = explicitFollowUpCard || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Banish', 'Special Summon'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
      followUpCard,
      followUpZone: findCardZone(trimmed, followUpCard, followUpCard === sourceCard ? 2 : 1),
      raw: trimmed,
    };
  }

  const activateSendThenSelfSummonMatch = trimmed.match(
    /activate\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+send\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)\s+(?:and|to)\s+special\s+summon\s+(?:itself|\[(.+?)\])[.!]?$/i,
  );

  if (activateSendThenSelfSummonMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetZone, explicitFollowUpCard] = activateSendThenSelfSummonMatch;
    const followUpCard = explicitFollowUpCard || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Send to GY', 'Special Summon'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      followUpCard,
      followUpZone: findCardZone(trimmed, followUpCard, followUpCard === sourceCard ? 2 : 1),
      raw: trimmed,
    };
  }

  const activateAddToHandMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateAddThenDiscardMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))\s*,?\s*then\s+discard\s+(?:it|\[(.+?)\])[.!]?$/i,
  );

  const activateRevealThenAddMatch = trimmed.match(
    /activate\s+\[(.+?)\]\s*,?\s*reveal\s+\[(.+?)\]\s*,?\s*then\s+add\s+(.+)\s+to\s+(?:the\s+|your\s+)?hand[.!]?$/i,
  );

  const activateRevealThenSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*reveal\s+(?:itself|\[(.+?)\])\s+(?:to|and)\s+special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  const activateBanishThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+banish\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+and\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  if (activateBanishThenAddMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      targetCard,
      rawTargetZone,
      followUpCard,
      rawFollowUpOriginZoneA,
      rawFollowUpOriginZoneB,
    ] = activateBanishThenAddMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Banish', 'Add to Hand'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
      followUpCard,
      followUpZone: 'hand',
      targetOriginZone: normalizeZone(rawFollowUpOriginZoneA || rawFollowUpOriginZoneB),
      raw: trimmed,
    };
  }

  if (activateRevealThenSummonMatch) {
    const [, sourceCard, rawSourceZone, explicitRevealCard, followUpCard, rawFollowUpZone] = activateRevealThenSummonMatch;
    const targetCard = explicitRevealCard || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Reveal', 'Special Summon'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard, targetCard === sourceCard ? 2 : 1),
      followUpCard,
      followUpZone: rawFollowUpZone ? normalizeZone(rawFollowUpZone) : findCardZone(trimmed, followUpCard),
      raw: trimmed,
    };
  }

  if (activateRevealThenAddMatch) {
    const [, sourceCard, revealCard, addedCardsText] = activateRevealThenAddMatch;
    const followUpCards = extractCardRefs(addedCardsText);

    if (followUpCards.length > 0) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Reveal', 'Add to Hand'],
        sourceCard,
        sourceZone: findCardZone(trimmed, sourceCard),
        targetCard: revealCard,
        followUpCard: followUpCards[0],
        followUpZone: 'hand',
        followUpCards,
        followUpZones: repeatZone('hand', followUpCards.length),
        raw: trimmed,
      };
    }
  }

  if (activateAddThenDiscardMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetOriginZoneA, rawTargetOriginZoneB, explicitDiscardCard] = activateAddThenDiscardMatch;
    const discardCard = explicitDiscardCard || sourceCard;
    const targetOriginZone = normalizeZone(rawTargetOriginZoneA || rawTargetOriginZoneB);

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Add to Hand', 'Discard'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: 'hand',
      targetOriginZone,
      followUpCard: discardCard,
      followUpZone: 'gy',
      raw: trimmed,
    };
  }

  if (activateAddToHandMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetOriginZoneA, rawTargetOriginZoneB] = activateAddToHandMatch;
    const targetOriginZone = normalizeZone(rawTargetOriginZoneA || rawTargetOriginZoneB);

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Add to Hand'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: 'hand',
      targetOriginZone,
      raw: trimmed,
    };
  }

  const activateSearchMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?search\s+\[(.+?)\][.!]?$/i,
  );

  if (activateSearchMatch) {
    const [, sourceCard, targetCard] = activateSearchMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Search'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      raw: trimmed,
    };
  }

  const activateSendMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?send\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)[.!]?$/i,
  );

  if (activateSendMatch) {
    const [, sourceCard, targetCard, rawTargetZone] = activateSendMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Send to GY'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const activateTargetMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?target\s+\[(.+?)\][.!]?$/i,
  );

  if (activateTargetMatch) {
    const [, sourceCard, targetCard] = activateTargetMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Target'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const activateDestroyMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?destroy\s+\[(.+?)\][.!]?$/i,
  );

  if (activateDestroyMatch) {
    const [, sourceCard, targetCard] = activateDestroyMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Destroy'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const activateBanishMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?banish\s+\[(.+?)\][.!]?$/i,
  );

  if (activateBanishMatch) {
    const [, sourceCard, targetCard] = activateBanishMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Banish'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const activateReturnMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?return\s+\[(.+?)\]\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)[.!]?$/i,
  );

  if (activateReturnMatch) {
    const [, sourceCard, targetCard, rawTargetZone] = activateReturnMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Return'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const activateSetMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?set\s+\[(.+?)\][.!]?$/i,
  );

  if (activateSetMatch) {
    const [, sourceCard, targetCard] = activateSetMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Set'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const activateTargetSetMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\]\s+target\s+\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+and\s+set\s+(?:it|\[(.+?)\])[.!]?$/i,
  );

  if (activateTargetSetMatch) {
    const [, sourceCard, targetCard, rawTargetZone, explicitSetCard] = activateTargetSetMatch;
    const resolvedTargetCard = explicitSetCard || targetCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Target', 'Set'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: resolvedTargetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, resolvedTargetCard),
      raw: trimmed,
    };
  }

  const activateActionMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\]\s+to\s+(destroy|banish|set|return|special\s+summon|search|target)\s+\[(.+?)\](?:\s+(?:to|from)\s+the?\s*(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?/i,
  );

  if (activateActionMatch) {
    const [, sourceCard, rawEffect, targetCard, rawZone] = activateActionMatch;
    const normalizedEffect = rawEffect.toLowerCase();
    const effectMeta: Record<string, { type: ComboAction['type']; label: string }> = {
      destroy: { type: 'destroy', label: 'Destroy' },
      banish: { type: 'banish', label: 'Banish' },
      set: { type: 'set', label: 'Set' },
      return: { type: 'return', label: 'Return' },
      'special summon': { type: 'summon', label: 'Special Summon' },
      search: { type: 'search', label: 'Search' },
      target: { type: 'target', label: 'Target' },
    };
    const effect = effectMeta[normalizedEffect];

    if (effect) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', effect.label],
        sourceCard,
        sourceZone: findCardZone(trimmed, sourceCard),
        targetCard,
        targetZone: rawZone ? normalizeZone(rawZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const activateTargetingMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\]\s+(?:targeting|to\s+target)\s+\[(.+?)\]/i,
  );

  if (activateTargetingMatch) {
    const [, sourceCard, targetCard] = activateTargetingMatch;
    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Target'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const directTargetingMatch = trimmed.match(/\[(.+?)\]\s+targets\s+\[(.+?)\]/i);

  if (directTargetingMatch) {
    const [, sourceCard, targetCard] = directTargetingMatch;
    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Target'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const targetOnlyMatch = trimmed.match(/target\s+\[(.+?)\]/i);

  if (targetOnlyMatch) {
    const [, targetCard] = targetOnlyMatch;
    return {
      type: 'target',
      label: 'Target',
      sourceCard: targetCard,
      sourceZone: findCardZone(trimmed, targetCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      targetOnly: true,
      raw: trimmed,
    };
  }

  return null;
}

function parseSequentialCompoundStep(trimmed: string): ComboAction | null {
  const tributeTargetSpecialSummonMatch = trimmed.match(
    /^tribute\s+\[(.+?)\]\s+target\s+\[(.+?)\]\s+in\s+the\s+(gy|graveyard)\s+and\s+special\s+summon\s+(?:it|\[(.+?)\])[.!]?$/i,
  );

  if (tributeTargetSpecialSummonMatch) {
    const [, sourceCard, targetCard, rawTargetZone, explicitSummonCard] = tributeTargetSpecialSummonMatch;

    return {
      type: 'tribute',
      label: 'Tribute',
      labels: ['Tribute', 'Target', 'Special Summon'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: explicitSummonCard || targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const tributeIntoSummonMatch = trimmed.match(
    /^tribute\s+\[(.+?)\]\s+to\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (tributeIntoSummonMatch) {
    const [, sourceCard, targetCard, rawTargetZone] = tributeIntoSummonMatch;

    return {
      type: 'summon',
      label: 'Tribute',
      labels: ['Tribute', 'Summon'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const normalIntoActivateSpecialMatch = trimmed.match(
    /^(?:normal|flip)\s+summon\s+\[(.+?)\]\s*,\s*activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (normalIntoActivateSpecialMatch) {
    const [, firstCard, effectCardA, effectCardB, targetCard, rawTargetZone] = normalIntoActivateSpecialMatch;
    const sourceCard = effectCardA || effectCardB || firstCard;

    return {
      type: 'activate',
      label: 'Normal Summon',
      labels: ['Normal Summon', 'Activate', 'Special Summon'],
      sourceCard,
      sourceZone: 'hand',
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const normalIntoActivateAddMatch = trimmed.match(
    /^(?:normal|flip)\s+summon\s+\[(.+?)\]\s*(?:,?\s*(?:and\s+)?)?(?:(?:activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+)?)(?:add|search)\s+\[(.+?)\]\s+(?:to\s+(?:your\s+)?hand|from\s+(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:your\s+)?hand)[.!]?$/i,
  );

  if (normalIntoActivateAddMatch) {
    const [, firstCard, effectCardA, effectCardB, targetCard] = normalIntoActivateAddMatch;
    const sourceCard = effectCardA || effectCardB || firstCard;

    return {
      type: 'activate',
      label: 'Normal Summon',
      labels: ['Normal Summon', 'Activate', 'Add to Hand'],
      sourceCard,
      sourceZone: 'hand',
      targetCard,
      targetZone: 'hand',
      raw: trimmed,
    };
  }

  const normalIntoActivateSendMatch = trimmed.match(
    /^(?:normal|flip)\s+summon\s+\[(.+?)\]\s*(?:,?\s*(?:and\s+)?)?(?:(?:(?:activate|use)\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+)?)send\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)[.!]?$/i,
  );

  if (normalIntoActivateSendMatch) {
    const [, firstCard, effectCardA, effectCardB, targetCard, rawTargetZone] = normalIntoActivateSendMatch;
    const sourceCard = effectCardA || effectCardB || firstCard;

    return {
      type: 'activate',
      label: 'Normal Summon',
      labels: ['Normal Summon', 'Activate', 'Send to GY'],
      sourceCard,
      sourceZone: 'hand',
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const specialIntoActivateSendMatch = trimmed.match(
    /^special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:,?\s*and\s+)?activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+send\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)[.!]?$/i,
  );

  if (specialIntoActivateSendMatch) {
    const [, firstCard, rawSourceZone, effectCardA, effectCardB, targetCard, rawTargetZone] = specialIntoActivateSendMatch;
    const sourceCard = effectCardA || effectCardB || firstCard;

    return {
      type: 'activate',
      label: 'Special Summon',
      labels: ['Special Summon', 'Activate', 'Send to GY'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  return null;
}

function parseMaterialSummonStep(trimmed: string): ComboAction | null {
  const summonUsingMatch = trimmed.match(
    /^(fusion|link|xyz|synchro|ritual)\s+summon\s+\[(.+?)\]\s+using\s+(.+)$/i,
  );

  if (summonUsingMatch) {
    const [, rawType, targetCard, materialsText] = summonUsingMatch;
    const normalizedType = rawType.toLowerCase() as Extract<ComboAction['type'], 'fusion' | 'link' | 'xyz' | 'synchro' | 'ritual'>;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      return {
        type: normalizedType,
        label: `${rawType[0].toUpperCase()}${rawType.slice(1).toLowerCase()} Summon`,
        sourceCard: sourceCards[0],
        sourceZone: findCardZone(trimmed, sourceCards[0]),
        sourceCards,
        sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const fuseIntoMatch = trimmed.match(
    /^fuse\s+(.+)\s+into\s+\[(.+?)\](?:\s+(?:from|in)\s+(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?$/i,
  );

  if (fuseIntoMatch) {
    const [, materialsText, targetCard, rawTargetZone] = fuseIntoMatch;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      return {
        type: 'fusion',
        label: 'Fusion Summon',
        sourceCard: sourceCards[0],
        sourceZone: findCardZone(trimmed, sourceCards[0]),
        sourceCards,
        sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const overlayIntoMatch = trimmed.match(/^overlay\s+(.+)\s+into\s+\[(.+?)\]$/i);

  if (overlayIntoMatch) {
    const [, materialsText, targetCard] = overlayIntoMatch;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      return {
        type: 'xyz',
        label: 'Xyz Summon',
        sourceCard: sourceCards[0],
        sourceZone: findCardZone(trimmed, sourceCards[0]),
        sourceCards,
        sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  return null;
}

function parseRitualSummonStep(trimmed: string): ComboAction | null {
  const ritualUsingMatch = trimmed.match(
    /ritual\s+summon\s+\[(.+?)\]\s+using\s+\[(.+?)\](?:\s+and\s+\[(.+?)\])?/i,
  );

  if (ritualUsingMatch) {
    const [, targetCard, firstMaterial, secondMaterial] = ritualUsingMatch;
    const sourceCards = [firstMaterial, secondMaterial].filter((cardName): cardName is string => Boolean(cardName));

    return {
      type: 'ritual',
      label: 'Ritual Summon',
      sourceCard: sourceCards[0],
      sourceZone: findCardZone(trimmed, sourceCards[0]),
      sourceCards,
      sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const tributeOrSacrificeMatch = trimmed.match(
    /(?:tribute|sacrifice)\s+\[(.+?)\](?:\s+and\s+\[(.+?)\])?\s+to\s+ritual\s+summon\s+\[(.+?)\]/i,
  );

  if (tributeOrSacrificeMatch) {
    const [, firstMaterial, secondMaterial, targetCard] = tributeOrSacrificeMatch;
    const sourceCards = [firstMaterial, secondMaterial].filter((cardName): cardName is string => Boolean(cardName));

    return {
      type: 'ritual',
      label: 'Ritual Summon',
      sourceCard: sourceCards[0],
      sourceZone: findCardZone(trimmed, sourceCards[0]),
      sourceCards,
      sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  return null;
}

export function parseComboStep(line: string): ComboAction {
  const trimmed = line.trim();
  const tributeTargetSpecialSummonMatch = trimmed.match(
    /^tribute\s+\[(.+?)\]\s+target\s+\[(.+?)\]\s+in\s+the\s+(gy|graveyard)\s+and\s+special\s+summon\s+(?:it|\[(.+?)\])[.!]?$/i,
  );

  if (tributeTargetSpecialSummonMatch) {
    const [, sourceCard, targetCard, rawTargetZone, explicitSummonCard] = tributeTargetSpecialSummonMatch;
    return {
      type: 'tribute',
      label: 'Tribute',
      labels: ['Tribute', 'Target', 'Special Summon'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: explicitSummonCard || targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const tributeIntoSummonMatch = trimmed.match(
    /^tribute\s+\[(.+?)\]\s+to\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (tributeIntoSummonMatch) {
    const [, sourceCard, targetCard, rawTargetZone] = tributeIntoSummonMatch;
    return {
      type: 'tribute',
      label: 'Tribute',
      labels: ['Tribute', 'Summon'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const continuousSpellTrapStep = parseContinuousSpellTrapStep(trimmed);
  if (continuousSpellTrapStep) return continuousSpellTrapStep;
  const multiTargetStep = parseMultiTargetStep(trimmed);
  if (multiTargetStep) return multiTargetStep;
  const sequentialCompoundStep = parseSequentialCompoundStep(trimmed);
  if (sequentialCompoundStep) return sequentialCompoundStep;
  const materialSummonStep = parseMaterialSummonStep(trimmed);
  if (materialSummonStep) return materialSummonStep;
  const ritualSummonStep = parseRitualSummonStep(trimmed);
  if (ritualSummonStep) return ritualSummonStep;
  const activateEffectStep = parseActivateEffectStep(trimmed);
  if (activateEffectStep) return activateEffectStep;
  const contextualStep = parseContextualStep(trimmed);
  if (contextualStep) return contextualStep;
  
  for (const { pattern, type, label } of ACTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      if (
        ((type === 'xyz' && label === 'Xyz Summon' && /^(xyz\s+summon|overlay)\b/i.test(trimmed)) ||
          (type === 'synchro' && label === 'Synchro Summon' && /^synchro\s+summon\b/i.test(trimmed))) &&
        match[3]
      ) {
        const isXyzOverlaySyntax = type === 'xyz' && /^overlay/i.test(trimmed);
        const targetCard = isXyzOverlaySyntax ? match[3] : match[1];
        const sourceCards = isXyzOverlaySyntax ? [match[1], match[2]] : [match[2], match[3]];

        return {
          type,
          label,
          sourceCard: sourceCards[0],
          sourceZone: findCardZone(trimmed, sourceCards[0]),
          sourceCards,
          sourceZones: [
            findCardZone(trimmed, sourceCards[0]),
            findCardZone(trimmed, sourceCards[1]),
          ],
          targetCard,
          targetZone: findCardZone(trimmed, targetCard),
          raw: trimmed,
        };
      }

      if (type === 'fusion' && label === 'Fusion Summon' && trimmed.toLowerCase().startsWith('fuse ')) {
        return {
          type,
          label,
          sourceCard: match[1],
          sourceZone: normalizeZone(match[2]),
          sourceCards: [match[1], match[3]],
          sourceZones: [normalizeZone(match[2]), normalizeZone(match[4])],
          targetCard: match[5],
          targetZone: normalizeZone(match[6]),
          raw: trimmed,
        };
      }

      if (type === 'scale' && label === 'Scale' && match[2]) {
        const explicitSide = match[2].toLowerCase();
        if (explicitSide === 'left' || explicitSide === 'right') {
          return {
            type,
            label,
            sourceCard: match[1],
            sourceZone: findCardZone(trimmed, match[1]),
            sourceCards: [match[1]],
            sourceZones: [findCardZone(trimmed, match[1])],
            scaleSides: [explicitSide],
            raw: trimmed,
          };
        }

        return {
          type,
          label,
          sourceCard: match[1],
          sourceZone: findCardZone(trimmed, match[1]),
          sourceCards: [match[1], match[2]],
          sourceZones: [
            findCardZone(trimmed, match[1]),
            findCardZone(trimmed, match[2]),
          ],
          raw: trimmed,
        };
      }

      if (type === 'activate' && label === 'Target') {
        return {
          type,
          label,
          sourceCard: match[1],
          sourceZone: findCardZone(trimmed, match[1]),
          targetCard: match[1],
          targetZone: findCardZone(trimmed, match[1]),
          targetOnly: true,
          raw: trimmed,
        };
      }

      // Handle special summon + send to GY combo
      if (type === 'summon' && label === 'Special Summon' && match[2]) {
        return {
          type: 'send-gy',
          label: 'Special Summon',
          labels: ['Special Summon', 'Send to GY'],
          sourceCard: match[1],
          sourceZone: findCardZone(trimmed, match[1]),
          targetCard: match[2],
          targetZone: findCardZone(trimmed, match[2]),
          raw: trimmed,
        };
      }

      // For send-gy where source/target might be swapped
      if (type === 'send-gy' && !match[2]) {
        return { type, label, sourceCard: match[1], sourceZone: findCardZone(trimmed, match[1]), raw: trimmed };
      }
      if (type === 'send-gy' && trimmed.toLowerCase().startsWith('send')) {
        return {
          type,
          label,
          sourceCard: match[2] || match[1],
          sourceZone: match[2] ? findCardZone(trimmed, match[2]) : undefined,
          targetCard: match[1],
          targetZone: findCardZone(trimmed, match[1]),
          raw: trimmed,
        };
      }

      return {
        type,
        label,
        sourceCard: match[1],
        sourceZone: inferDefaultSourceZone(label, findCardZone(trimmed, match[1])),
        targetCard: match[2],
        targetZone: match[2] ? findCardZone(trimmed, match[2]) : undefined,
        raw: trimmed,
      };
    }
  }

  // Fallback: extract any [Card Name] references
  const cardRefs = [...trimmed.matchAll(/\[(.+?)\]/g)].map(m => m[1]);
  return {
    type: 'generic',
    label: trimmed.replace(/\[.+?\]/g, '').trim().substring(0, 30) || 'Action',
    sourceCard: cardRefs[0] || 'Unknown',
    sourceZone: cardRefs[0] ? findCardZone(trimmed, cardRefs[0], 1) : undefined,
    targetCard: cardRefs[1],
    targetZone: cardRefs[1] ? findCardZone(trimmed, cardRefs[1], 1) : undefined,
    raw: trimmed,
  };
}

function assignChainLink(action: ComboAction, previousAction?: ComboAction): ComboAction {
  if (action.chainLink) return action;

  const isChainableActivate = action.type === 'activate' || action.type === 'target';
  const previousHasChainLink = previousAction?.chainLink !== undefined;
  const previousWasChainable = previousAction && (previousAction.type === 'activate' || previousAction.type === 'target');
  const previousChainLinkWasExplicit = previousAction?.chainLinkExplicit === true;

  if (
    isChainableActivate &&
    previousHasChainLink &&
    previousWasChainable &&
    previousChainLinkWasExplicit &&
    previousAction?.chainLink === 1
  ) {
    return {
      ...action,
      chainLink: (previousAction?.chainLink || 0) + 1,
    };
  }

  return action;
}

function assignScaleSides(action: ComboAction, currentScales: Partial<Record<ScaleSide, string>>): ComboAction {
  if (action.type !== 'scale') return action;

  const sourceCards = action.sourceCards && action.sourceCards.length > 0 ? action.sourceCards : [action.sourceCard];
  const sourceZones = action.sourceZones && action.sourceZones.length > 0 ? action.sourceZones : [action.sourceZone];

  const explicitSides = action.scaleSides;
  if (explicitSides && explicitSides.length > 0) {
    explicitSides.forEach((side, index) => {
      const cardName = sourceCards[index] || action.sourceCard;
      if (cardName) currentScales[side] = cardName;
    });
    return {
      ...action,
      sourceCards,
      sourceZones,
    };
  }

  if (sourceCards.length >= 2) {
    currentScales.left = sourceCards[0];
    currentScales.right = sourceCards[1];
    return {
      ...action,
      sourceCards,
      sourceZones,
      scaleSides: ['left', 'right'],
    };
  }

  const preferredSide: ScaleSide = !currentScales.right ? 'right' : !currentScales.left ? 'left' : 'right';
  currentScales[preferredSide] = sourceCards[0];

  return {
    ...action,
    sourceCards,
    sourceZones,
    scaleSides: [preferredSide],
  };
}

export function parseCombo(text: string): ComboAction[] {
  const normalizedText = normalizeCardReferenceSyntax(text);
  const currentScales: Partial<Record<ScaleSide, string>> = {};
  let previousAction: ComboAction | undefined;

  return normalizedText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map((line) => {
      const { text: strippedLine, chainLink } = stripChainLinkPrefix(line);
      const expandedLine = expandSummonShorthand(strippedLine);
      const phase = detectPhase(expandedLine);
      const parsedAction = parseComboStep(expandedLine);
      const withPhase = phase ? { ...parsedAction, phase } : parsedAction;
      const withChainLink = assignChainLink(
        chainLink ? { ...withPhase, chainLink, chainLinkExplicit: true } : withPhase,
        previousAction,
      );
      const finalAction = assignScaleSides(withChainLink, currentScales);
      previousAction = finalAction;
      return finalAction;
    });
}
