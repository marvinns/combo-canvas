export type CardZone = 'hand' | 'gy' | 'deck' | 'extra-deck' | 'banished';
export type ScaleSide = 'left' | 'right';
export type ComboPhase = 'Draw Phase' | 'Main Phase 1' | 'Battle Phase' | 'Main Phase 2' | 'End Phase';

export interface ComboStepPath {
  label: string;
  baseStep: number;
  route?: number;
  substep?: string;
}

export interface ComboAction {
  type: 'summon' | 'ritual' | 'send-gy' | 'activate' | 'target' | 'search' | 'banish' | 'draw' | 'set' | 'tribute' | 'link' | 'xyz' | 'synchro' | 'fusion' | 'pendulum' | 'scale' | 'return' | 'negate' | 'destroy' | 'discard' | 'detach' | 'reveal' | 'continuous' | 'field-spell' | 'generic';
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
  stepPath?: ComboStepPath;
  raw: string;
}

export interface ComboBranchRoute {
  route: number;
  actionIndices: number[];
}

export interface ComboBranchGroup {
  baseStep: number;
  branchActionIndex?: number;
  mergeActionIndex?: number;
  routes: ComboBranchRoute[];
}

const SELF_REFERENCE_PATTERN = '(?:it|itself|her|herself|him|himself)';
const ACTIVATED_REFERENCE_PATTERN = '(?:it|itself|its\\s+effect|her|herself|her\\s+effect|him|himself|his\\s+effect)';
const ZONE_PATTERN = 'hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment';

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

function extractBareCardNames(text: string): string[] {
  return text
    .split(/\s*(?:,|and)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

function findCardZone(text: string, cardName: string, occurrence = 1): CardZone | undefined {
  const regex = new RegExp(
    `\\[${escapeRegExp(cardName)}\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?`,
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

function defaultTargetZoneForActivateLabel(label: string, fallback: CardZone | undefined): CardZone | undefined {
  if (label === 'Discard') return 'gy';
  if (label === 'Draw') return 'hand';
  if (label === 'Send to GY') return 'gy';
  return fallback;
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

function stripLeadingPhaseForParsing(text: string): string {
  return text.replace(
    /^(?:(?:during\s+the\s+)?(?:draw\s+phase|main\s+phase\s+1|battle\s+phase|main\s+phase\s+2|end\s+phase|dp|mp1|bp|mp2|ep))\s*,?\s*/i,
    '',
  );
}

function stripLeadingMetadata(line: string): { text: string; chainLink?: number } {
  let text = line.trim();
  let chainLink: number | undefined;

  while (text) {
    const chainLinkMatch = text.match(/^(?:chain\s*link|cl)\s*(\d+)\s+(.*)$/i);
    if (chainLinkMatch) {
      chainLink = Number(chainLinkMatch[1]);
      text = chainLinkMatch[2].trim();
      continue;
    }

    const withoutPhase = stripLeadingPhaseForParsing(text);
    if (withoutPhase !== text) {
      text = withoutPhase.trim();
      continue;
    }

    break;
  }

  return { text, chainLink };
}

function stripLeadingStepPath(line: string): { text: string; stepPath?: ComboStepPath } {
  const match = line.trim().match(/^(\d+)(?:\.(\d+)([a-z]+)?)?[\s.,:)-]+(.+)$/i);
  if (!match) return { text: line.trim() };

  const baseStep = Number(match[1]);
  const route = match[2] ? Number(match[2]) : undefined;
  const substep = match[3]?.toLowerCase();

  return {
    text: match[4].trim(),
    stepPath: {
      label: route === undefined ? String(baseStep) : `${baseStep}.${route}${substep ?? ''}`,
      baseStep,
      route,
      substep,
    },
  };
}

function normalizeCardReferenceSyntax(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '[$1]');
}

function stripCardTagsForParsing(text: string): string {
  return text
    .replace(/\(([^()[\]\n]+)\)\s*(\[[^\]\n]+\])/g, '$2')
    .replace(/(\[[^\]\n]+\])\s*\(([^()[\]\n]+)\)/g, '$1');
}

function stripCustomStepTagsForParsing(text: string): string {
  return text.replace(/\s*"[^"\n]+"\s*/g, ' ').replace(/\s+/g, ' ').trim();
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

  const setMatch = trimmed.match(/^set\s+(\[[^\]]+\](?:\s*(?:,|and)\s*\[[^\]]+\])+)(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?[.!]?$/i);
  if (setMatch) {
    const [, targetsText, rawZone] = setMatch;
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length > 1) {
      const zone = rawZone ? normalizeZone(rawZone) : undefined;

      return {
        type: 'set',
        label: 'Set',
        sourceCard: targetCards[0],
        targetCard: targetCards[0],
        targetCards,
        targetZone: zone,
        targetZones: zone ? repeatZone(zone, targetCards.length) : targetCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetOnly: true,
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
  const activatePutThenSelfSummonMatch = trimmed.match(
    new RegExp(
      `^activate\\s+\\[(.+?)\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?\\s+(?:to\\s+)?put\\s+\\[(.+?)\\]\\s+in\\s+the\\s+${zonePattern}\\s+(?:and|then|to)\\s+special\\s+summon\\s+(?:itself|it|\\[(.+?)\\])(?:\\s+from\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?[.!]?$`,
      'i',
    ),
  );

  if (activatePutThenSelfSummonMatch) {
    const [, sourceCard, rawSourceZone, targetCard, explicitFollowUpCard, rawFollowUpZone] = activatePutThenSelfSummonMatch;
    const sourceZone = rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard);
    const followUpCard = explicitFollowUpCard || sourceCard;
    const followUpZone = rawFollowUpZone
      ? normalizeZone(rawFollowUpZone)
      : followUpCard === sourceCard
        ? sourceZone
        : findCardZone(trimmed, followUpCard);

    return {
      type: 'continuous',
      label: 'Continuous Spell & Trap',
      labels: ['Activate', 'Continuous Spell & Trap', 'Special Summon'],
      sourceCard,
      sourceZone,
      targetCard,
      followUpCard,
      followUpZone,
      raw: trimmed,
    };
  }

  const activateSelfMatch = trimmed.match(
    new RegExp(
      `^activate\\s+\\[(.+?)\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?\\s+(?:,?\\s*and\\s+)?put\\s+(?:itself|it|\\[(.+?)\\])\\s+in\\s+the\\s+${zonePattern}[.!]?$`,
      'i',
    ),
  );

  if (activateSelfMatch) {
    const [, sourceCard, rawSourceZone, explicitTargetCard] = activateSelfMatch;
    const targetCard = explicitTargetCard || sourceCard;

    return {
      type: 'continuous',
      label: 'Continuous Spell & Trap',
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      raw: trimmed,
    };
  }

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

function parseFieldSpellStep(trimmed: string): ComboAction | null {
  const zonePattern = 'field\\s+spell\\s+zone';

  const activatePlaceMatch = trimmed.match(
    new RegExp(
      `^activate\\s+\\[(.+?)\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?\\s+(?:,?\\s*and\\s+)?(?:place|put)\\s+\\[(.+?)\\]\\s+in\\s+the\\s+${zonePattern}[.!]?$`,
      'i',
    ),
  );

  if (activatePlaceMatch) {
    const [, sourceCard, rawSourceZone, targetCard] = activatePlaceMatch;
    return {
      type: 'field-spell',
      label: 'Field Spell Zone',
      labels: ['Activate', 'Field Spell Zone'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      raw: trimmed,
    };
  }

  const directPutMatch = trimmed.match(
    new RegExp(`^put\\s+\\[(.+?)\\]\\s+in\\s+the\\s+${zonePattern}[.!]?$`, 'i'),
  );

  if (directPutMatch) {
    const [, targetCard] = directPutMatch;
    return {
      type: 'field-spell',
      label: 'Field Spell Zone',
      sourceCard: targetCard,
      targetCard,
      targetOnly: true,
      raw: trimmed,
    };
  }

  const activateFieldSpellMatch = trimmed.match(/^activate\s+field\s+spell\s+\[(.+?)\][.!]?$/i);
  if (activateFieldSpellMatch) {
    const [, targetCard] = activateFieldSpellMatch;
    return {
      type: 'field-spell',
      label: 'Field Spell Zone',
      sourceCard: targetCard,
      targetCard,
      targetOnly: true,
      raw: trimmed,
    };
  }

  const useFieldSpellMatch = trimmed.match(/^use\s+field\s+spell\s+\[(.+?)\][.!]?$/i);
  if (useFieldSpellMatch) {
    const [, targetCard] = useFieldSpellMatch;
    return {
      type: 'field-spell',
      label: 'Field Spell Zone',
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

function expandSummonShorthand(line: string): string {
  return line
    .replace(/\bNS\b(?=\s+\[)/gi, 'Normal Summon')
    .replace(/\bSS\b(?=\s+(?:\[|itself\b|it\b|herself\b|her\b|himself\b|him\b))/gi, 'Special Summon')
    .replace(/\bFS\b(?=\s+\[)/gi, 'Fusion Summon');
}

function normalizeRepeatedZoneArticles(line: string): string {
  return line.replace(
    /\bthe(?:\s+the)+\s+(?=hand\b|deck\b|gy\b|graveyard\b|extra\s+deck\b|banished\b|banishment\b)/gi,
    'the ',
  );
}

type ActivateClauseResult = {
  label: string;
  targetCard?: string;
  targetCards?: string[];
  targetZone?: CardZone;
  targetZones?: Array<CardZone | undefined>;
  targetOriginZone?: CardZone;
};

type LeadingChainClauseResult = {
  label: string;
  sourceCard: string;
  sourceZone?: CardZone;
  remainder: string;
};

function parseActivateClause(clause: string, sourceCard: string, fullText: string): ActivateClauseResult | null {
  const trimmedClause = clause.trim().replace(/[.!]+$/, '');

  const addMatch = trimmedClause.match(
    /^add\s+(.+?)(?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?$/i,
  );
  if (addMatch) {
    const [, addedCardsText, rawTargetOriginZoneA, rawTargetOriginZoneB] = addMatch;
    const targetCards = extractCardRefs(addedCardsText);
    const resolvedTargetCards = new RegExp(`^${SELF_REFERENCE_PATTERN}$`, 'i').test(addedCardsText.trim())
      ? [sourceCard]
      : targetCards;
    if (resolvedTargetCards.length > 0) {
      return {
        label: 'Add to Hand',
        targetCard: resolvedTargetCards[0],
        targetCards: resolvedTargetCards.length > 1 ? resolvedTargetCards : undefined,
        targetZone: 'hand',
        targetZones: resolvedTargetCards.length > 1 ? repeatZone('hand', resolvedTargetCards.length) : undefined,
        targetOriginZone: normalizeZone(rawTargetOriginZoneA || rawTargetOriginZoneB),
      };
    }
  }

  const searchMatch = trimmedClause.match(
    /^search\s+(?:for\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment))?$/i,
  );
  if (searchMatch) {
    const [, bracketedTargetCard, plainTargetCard, rawTargetOriginZone] = searchMatch;
    const targetCard = (bracketedTargetCard || plainTargetCard)?.trim();
    if (targetCard) {
      return {
        label: 'Search',
        targetCard,
        targetZone: 'hand',
        targetOriginZone: normalizeZone(rawTargetOriginZone),
      };
    }
  }

  const summonMatch = trimmedClause.match(new RegExp(
    `^special\\s+summon\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])(?:\\s+from\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?$`,
    'i',
  ));
  if (summonMatch) {
    const [, explicitTargetCard, rawTargetZone] = summonMatch;
    const targetCard = explicitTargetCard || sourceCard;
    return {
      label: 'Special Summon',
      targetCard,
      targetZone: rawTargetZone
        ? normalizeZone(rawTargetZone)
        : targetCard === sourceCard
          ? findCardZone(fullText, sourceCard)
          : findCardZone(fullText, targetCard),
    };
  }

  const typedSummonMatch = trimmedClause.match(new RegExp(
    `^(fusion|synchro|link|xyz|ritual|pendulum|normal)\\s+summon\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])(?:\\s+from\\s+(?:the\\s+)?(${ZONE_PATTERN}))?$`,
    'i',
  ));
  if (typedSummonMatch) {
    const [, rawSummonType, explicitTargetCard, rawTargetZone] = typedSummonMatch;
    const targetCard = explicitTargetCard || sourceCard;
    const summonType = rawSummonType.toLowerCase();
    const label = `${summonType[0].toUpperCase()}${summonType.slice(1)} Summon`;

    return {
      label,
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(fullText, targetCard),
    };
  }

  const scaleMatch = trimmedClause.match(new RegExp(`^scale\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])$`, 'i'));
  if (scaleMatch) {
    return {
      label: 'Scale',
      targetCard: scaleMatch[1] || sourceCard,
    };
  }

  const continuousZoneMatch = trimmedClause.match(
    /^(?:put|place)\s+\[([^\]]+)\]\s+in\s+the\s+continuous\s+spell\s+(?:and|&)\s+trap\s+zone$/i,
  );
  if (continuousZoneMatch) {
    return {
      label: 'Continuous Spell & Trap',
      targetCard: continuousZoneMatch[1],
    };
  }

  const fieldSpellZoneMatch = trimmedClause.match(
    /^(?:put|place)\s+\[([^\]]+)\]\s+in\s+the\s+field\s+spell\s+zone$/i,
  );
  if (fieldSpellZoneMatch) {
    return {
      label: 'Field Spell Zone',
      targetCard: fieldSpellZoneMatch[1],
    };
  }

  const returnMatch = trimmedClause.match(/^return\s+(.+)\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)$/i);
  if (returnMatch) {
    const [, targetsText, rawTargetZone] = returnMatch;
    const targetCards = extractCardRefs(targetsText);
    const resolvedTargetCards = new RegExp(`^${SELF_REFERENCE_PATTERN}$`, 'i').test(targetsText.trim())
      ? [sourceCard]
      : targetCards.length > 0
        ? targetCards
        : extractBareCardNames(targetsText);

    if (resolvedTargetCards.length > 0) {
      const targetZone = normalizeZone(rawTargetZone);
      return {
        label: 'Return',
        targetCard: resolvedTargetCards[0],
        targetCards: resolvedTargetCards.length > 1 ? resolvedTargetCards : undefined,
        targetZone,
        targetZones: resolvedTargetCards.length > 1 ? repeatZone(targetZone, resolvedTargetCards.length) : undefined,
      };
    }
  }

  const sendMatch = trimmedClause.match(new RegExp(
    `^send\\s+(.+?)(?:\\s+from\\s+(?:the\\s+)?(${ZONE_PATTERN}))?\\s+to\\s+the?\\s*(gy|graveyard)$`,
    'i',
  ));
  if (sendMatch) {
    const [, targetsText, rawTargetOriginZone, rawTargetZone] = sendMatch;
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length > 0) {
      const targetZone = normalizeZone(rawTargetZone);
      return {
        label: 'Send to GY',
        targetCard: targetCards[0],
        targetCards: targetCards.length > 1 ? targetCards : undefined,
        targetZone,
        targetZones: targetCards.length > 1 ? repeatZone(targetZone, targetCards.length) : undefined,
        targetOriginZone: normalizeZone(rawTargetOriginZone),
      };
    }
  }

  const banishMatch = trimmedClause.match(new RegExp(
    `^banish\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])(?:\\s+from\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?$`,
    'i',
  ));
  if (banishMatch) {
    const [, explicitTargetCard, rawTargetZone] = banishMatch;
    const targetCard = explicitTargetCard || sourceCard;
    return {
      label: 'Banish',
      targetCard,
      targetZone: rawTargetZone
        ? normalizeZone(rawTargetZone)
        : targetCard === sourceCard
          ? findCardZone(fullText, sourceCard)
          : findCardZone(fullText, targetCard),
    };
  }

  const destroyMatch = trimmedClause.match(new RegExp(`^destroy\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])$`, 'i'));
  if (destroyMatch) {
    const [, targetCard] = destroyMatch;
    const resolvedTargetCard = targetCard || sourceCard;
    return {
      label: 'Destroy',
      targetCard: resolvedTargetCard,
      targetZone: findCardZone(fullText, resolvedTargetCard),
    };
  }

  const discardMatch = trimmedClause.match(new RegExp(`^discard\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])\\s*,?$`, 'i'));
  if (discardMatch) {
    const [, explicitTargetCard] = discardMatch;
    return {
      label: 'Discard',
      targetCard: explicitTargetCard || sourceCard,
      targetZone: 'gy',
    };
  }

  const simpleTargetEffectMatch = trimmedClause.match(new RegExp(
    `^(detach|draw|negate|reveal)\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\]|(\\d+\\s+cards?))(?:\\s+from\\s+(?:the\\s+)?(${ZONE_PATTERN}))?$`,
    'i',
  ));
  if (simpleTargetEffectMatch) {
    const [, rawEffect, explicitTargetCard, drawAmount, rawTargetZone] = simpleTargetEffectMatch;
    const effectLabels: Record<string, string> = {
      detach: 'Detach',
      draw: 'Draw',
      negate: 'Negate',
      reveal: 'Reveal',
    };
    const label = effectLabels[rawEffect.toLowerCase()];
    const targetCard = explicitTargetCard || drawAmount || sourceCard;

    return {
      label,
      targetCard,
      targetZone: label === 'Draw'
        ? 'hand'
        : rawTargetZone
          ? normalizeZone(rawTargetZone)
          : findCardZone(fullText, targetCard),
    };
  }

  const tributeMatch = trimmedClause.match(new RegExp(`^tribute\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])$`, 'i'));
  if (tributeMatch) {
    const [, explicitTargetCard] = tributeMatch;
    const targetCard = explicitTargetCard || sourceCard;
    return {
      label: 'Tribute',
      targetCard,
      targetZone: findCardZone(fullText, targetCard),
    };
  }

  const detachMatch = trimmedClause.match(/^detach\s+\[([^\]]+)\]$/i);
  if (detachMatch) {
    const [, targetCard] = detachMatch;
    return {
      label: 'Detach',
      targetCard,
      targetZone: findCardZone(fullText, targetCard),
    };
  }

  const targetMatch = trimmedClause.match(
    /^target\s+\[([^\]]+)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?$/i,
  );
  if (targetMatch) {
    const [, targetCard, rawTargetZone] = targetMatch;
    return {
      label: 'Target',
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(fullText, targetCard),
    };
  }

  const setMatch = trimmedClause.match(new RegExp(
    `^set\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\])(?:\\s+from\\s+(?:the\\s+)?(hand|deck|gy|graveyard|extra\\s+deck|banished(?:\\s+zone)?|banishment))?$`,
    'i',
  ));
  if (setMatch) {
    const [, explicitTargetCard, rawTargetZone] = setMatch;
    const targetCard = explicitTargetCard || sourceCard;
    return {
      label: 'Set',
      targetCard,
      targetZone: rawTargetZone
        ? normalizeZone(rawTargetZone)
        : targetCard === sourceCard
          ? findCardZone(fullText, sourceCard)
          : findCardZone(fullText, targetCard),
    };
  }

  return null;
}

function comboActionFromActivateClauses(
  sourceCard: string,
  sourceZone: CardZone | undefined,
  clauses: [ActivateClauseResult, ActivateClauseResult?],
  raw: string,
): ComboAction {
  const [firstClause, secondClause] = clauses;

  return {
    type: 'activate',
    label: 'Activate',
    labels: ['Activate', ...clauses.map((clause) => clause.label)],
    sourceCard,
    sourceZone,
    targetCard: firstClause.targetCard,
    targetCards: firstClause.targetCards,
    targetZone: firstClause.targetZone,
    targetZones: firstClause.targetZones,
    followUpCard: secondClause?.targetCard,
    followUpCards: secondClause?.targetCards,
    followUpZone: secondClause?.targetZone,
    followUpZones: secondClause?.targetZones,
    targetOriginZone:
      secondClause?.targetOriginZone ||
      firstClause.targetOriginZone ||
      (firstClause.label === 'Target' ? firstClause.targetZone : undefined),
    raw,
  };
}

function parseGenericThreeWayActivateStep(trimmed: string): ComboAction | null {
  const match = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*(?:,?\s*)?(?:to\s+)?(.+?)\s+(?:and|then|to)\s+(?=(?:add|search|special\s+summon|ss|fusion\s+summon|synchro\s+summon|link\s+summon|xyz\s+summon|ritual\s+summon|pendulum\s+summon|normal\s+summon|scale|put|place|return|send|banish|destroy|discard|detach|draw|negate|tribute|target|set|reveal)\b)(.+?)[.!]?$/i,
  );
  if (!match) return null;

  const [, bracketedSourceCard, plainSourceCard, rawSourceZone, firstClauseText, secondClauseText] = match;
  const sourceCard = (bracketedSourceCard || plainSourceCard)?.trim();
  if (!sourceCard) return null;

  const firstClause = parseActivateClause(firstClauseText, sourceCard, trimmed);
  const secondReferenceCard =
    /\bit\b/i.test(secondClauseText) && !/\bitself\b/i.test(secondClauseText)
      ? firstClause?.targetCard || sourceCard
      : sourceCard;
  const secondClause = parseActivateClause(secondClauseText, secondReferenceCard, trimmed);
  if (!firstClause || !secondClause) return null;

  return comboActionFromActivateClauses(
    sourceCard,
    rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
    [firstClause, secondClause],
    trimmed,
  );
}

function parseLeadingChainClause(text: string): LeadingChainClauseResult | null {
  const patterns: Array<{
    label: string;
    pattern: RegExp;
    sourceZone?: (match: RegExpMatchArray) => CardZone | undefined;
  }> = [
    {
      label: 'Discard',
      pattern: /^discard\s+\[([^\]]+)\](.*)$/i,
      sourceZone: () => 'hand',
    },
    {
      label: 'Tribute',
      pattern: /^tribute\s+\[([^\]]+)\](.*)$/i,
      sourceZone: (match) => findCardZone(match[0], match[1]),
    },
    {
      label: 'Return',
      pattern: /^return\s+\[([^\]]+)\]\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
    {
      label: 'Banish',
      pattern: /^banish\s+\[([^\]]+)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
    {
      label: 'Send to GY',
      pattern: /^send\s+\[([^\]]+)\]\s+to\s+the?\s*(gy|graveyard)(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
    {
      label: 'Add to Hand',
      pattern: /^add\s+\[([^\]]+)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))(.*)$/i,
      sourceZone: () => 'hand',
    },
    {
      label: 'Special Summon',
      pattern: /^special\s+summon\s+\[([^\]]+)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
    {
      label: 'Set',
      pattern: /^set\s+\[([^\]]+)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
    {
      label: 'Destroy',
      pattern: /^destroy\s+\[([^\]]+)\](.*)$/i,
      sourceZone: (match) => findCardZone(match[0], match[1]),
    },
    {
      label: 'Target',
      pattern: /^target\s+\[([^\]]+)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(.*)$/i,
      sourceZone: (match) => normalizeZone(match[2]),
    },
  ];

  for (const { label, pattern, sourceZone } of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const sourceCard = match[1];
    const remainder = match[match.length - 1]?.trim() ?? '';

    return {
      label,
      sourceCard,
      sourceZone: sourceZone?.(match),
      remainder,
    };
  }

  return null;
}

function splitChainRemainder(remainder: string): { secondClause: string; thirdClause: string } | null {
  const cleaned = remainder
    .replace(/^\s*,?\s*(?:and\s+activate\s+(?:its\s+effect|it)\s+to|activate\s+(?:its\s+effect|it)\s+to|to|and)\s+/i, '')
    .trim();

  if (!cleaned) return null;

  const clauseBoundary = cleaned.match(/\s+(?:and|then|to)\s+(?=(?:add|search|special\s+summon|ss|return|send|banish|destroy|tribute|target|set|reveal)\b)/i);
  if (!clauseBoundary || clauseBoundary.index === undefined) return null;

  const secondClause = cleaned.slice(0, clauseBoundary.index).trim();
  const thirdClause = cleaned.slice(clauseBoundary.index + clauseBoundary[0].length).trim();
  if (!secondClause || !thirdClause) return null;

  return { secondClause, thirdClause };
}

function parseSimpleActivateEffectStep(trimmed: string): ComboAction | null {
  const activateSimpleEffectMatch = trimmed.match(new RegExp(
    `^activate\\s+(?:the\\s+effect\\s+of\\s+)?\\[([^\\]]+)\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(${ZONE_PATTERN}))?(?:\\s*,)?\\s+(?:to\\s+)?(banish|destroy|detach|discard|draw|negate|set|target|tribute|reveal)\\s+(?:${SELF_REFERENCE_PATTERN}|\\[([^\\]]+)\\]|(\\d+\\s+cards?))(?:\\s+from\\s+(?:the\\s+)?(${ZONE_PATTERN}))?[.!]?$`,
    'i',
  ));

  if (activateSimpleEffectMatch) {
    const [, sourceCard, rawSourceZone, rawEffect, explicitTargetCard, drawAmount, rawTargetZone] = activateSimpleEffectMatch;
    const effectMeta: Record<string, { type: ComboAction['type']; label: string }> = {
      banish: { type: 'banish', label: 'Banish' },
      destroy: { type: 'destroy', label: 'Destroy' },
      detach: { type: 'detach', label: 'Detach' },
      discard: { type: 'discard', label: 'Discard' },
      draw: { type: 'draw', label: 'Draw' },
      negate: { type: 'negate', label: 'Negate' },
      set: { type: 'set', label: 'Set' },
      target: { type: 'target', label: 'Target' },
      tribute: { type: 'tribute', label: 'Tribute' },
      reveal: { type: 'reveal', label: 'Reveal' },
    };
    const effect = effectMeta[rawEffect.toLowerCase()];
    const targetCard = explicitTargetCard || drawAmount || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', effect.label],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: targetCard
        ? defaultTargetZoneForActivateLabel(
            effect.label,
            rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard, targetCard === sourceCard ? 2 : 1),
          )
        : defaultTargetZoneForActivateLabel(effect.label, undefined),
      raw: trimmed,
    };
  }

  const activateSimpleSummonMatch = trimmed.match(new RegExp(
    `^activate\\s+(?:the\\s+effect\\s+of\\s+)?\\[([^\\]]+)\\](?:\\s+(?:from|in)\\s+(?:the\\s+)?(${ZONE_PATTERN}))?(?:\\s*,)?\\s+(?:to\\s+)?(fusion|synchro|link|xyz|ritual|pendulum)\\s+summon\\s+(\\[[^\\]]+\\](?:\\s*(?:,|and)\\s*\\[[^\\]]+\\])*)(?:\\s+from\\s+(?:the\\s+)?(${ZONE_PATTERN}))?(?:\\s+using\\s+(.+?))?[.!]?$`,
    'i',
  ));

  if (activateSimpleSummonMatch) {
    const [, sourceCard, rawSourceZone, rawSummonType, targetsText, rawTargetZone, materialsText] = activateSimpleSummonMatch;
    const targetCards = extractCardRefs(targetsText);
    if (targetCards.length === 0) return null;

    const sourceCards = materialsText ? extractCardRefs(materialsText) : undefined;
    const label = `${rawSummonType[0].toUpperCase()}${rawSummonType.slice(1).toLowerCase()} Summon`;
    const targetZone = rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCards[0]);

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', label],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      sourceCards: sourceCards && sourceCards.length > 0 ? sourceCards : undefined,
      sourceZones: sourceCards && sourceCards.length > 0 ? sourceCards.map((cardName) => findCardZone(trimmed, cardName)) : undefined,
      targetCard: targetCards[0],
      targetCards: targetCards.length > 1 ? targetCards : undefined,
      targetZone,
      targetZones: targetCards.length > 1 ? repeatZone(targetZone, targetCards.length) : undefined,
      raw: trimmed,
    };
  }

  return null;
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

  const genericThreeWayStep = parseGenericThreeWayActivateStep(trimmed);
  if (genericThreeWayStep) return genericThreeWayStep;

  const activateScaleMatch = trimmed.match(
    /^activate\s+(?:the\s+effect\s+of\s+)?\[([^\]]+)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+scale\s+(?:(itself|it)|\[([^\]]+)\](?:\s+and\s+\[([^\]]+)\])?)[.!]?$/i,
  );

  if (activateScaleMatch) {
    const [, sourceCard, rawSourceZone, selfScale, explicitScaleCard, rightScaleCard] = activateScaleMatch;
    const scaledCards = rightScaleCard
      ? [explicitScaleCard, rightScaleCard]
      : [selfScale ? sourceCard : explicitScaleCard].filter((cardName): cardName is string => Boolean(cardName));

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Scale'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard: scaledCards[0],
      targetCards: scaledCards.length > 1 ? scaledCards : undefined,
      targetZones: scaledCards.length > 1 ? scaledCards.map((cardName) => findCardZone(trimmed, cardName)) : undefined,
      scaleSides: scaledCards.length > 1 ? ['left', 'right'] : ['right'],
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

  const activateFusionSummonUsingMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?fusion\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+using\s+(.+?)[.!]?$/i,
  );

  if (activateFusionSummonUsingMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetZone, materialsText] = activateFusionSummonUsingMatch;
    const materialZoneMatch = materialsText.match(/\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment)$/i);
    const materialZone = normalizeZone(materialZoneMatch?.[1]);
    const cleanedMaterialsText = materialZoneMatch
      ? materialsText.slice(0, materialZoneMatch.index).trim()
      : materialsText;
    const sourceCards = extractCardRefs(cleanedMaterialsText);

    if (sourceCards.length > 0) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Fusion Summon'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        sourceCards,
        sourceZones: materialZone ? repeatZone(materialZone, sourceCards.length) : sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const activateBareFusionSummonUsingMatch = trimmed.match(
    /activate\s+(.+?)(?:\s*,)?\s+(?:to\s+)?fusion\s+summon\s+(.+?)(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+using\s+(.+?)[.!]?$/i,
  );

  if (activateBareFusionSummonUsingMatch && !trimmed.includes('[')) {
    const [, sourceCard, targetCard, rawTargetZone, materialsText] = activateBareFusionSummonUsingMatch;
    const sourceCards = extractBareCardNames(materialsText);

    if (sourceCard && targetCard && sourceCards.length > 0) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Fusion Summon'],
        sourceCard: sourceCard.trim(),
        sourceZone: findCardZone(trimmed, sourceCard.trim()),
        sourceCards,
        sourceZones: sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard: targetCard.trim(),
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard.trim()),
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

  const activateReturnThenSelfSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:,?\s*)?(?:to\s+)?return\s+(.+)\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)\s*(?:,?\s*)?(?:and\s+)?special\s+summon\s+(?:itself|it)[.!]?$/i,
  );

  if (activateReturnThenSelfSummonMatch) {
    const [, bracketedSourceCard, plainSourceCard, rawSourceZone, returnTargetsText, returnZone] = activateReturnThenSelfSummonMatch;
    const sourceCard = (bracketedSourceCard || plainSourceCard)?.trim();
    const targetCards = extractCardRefs(returnTargetsText);
    const targetZone = normalizeZone(returnZone);

    if (sourceCard && targetCards.length > 0) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Return', 'Special Summon'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard: targetCards[0],
        targetCards: targetCards.length > 1 ? targetCards : undefined,
        targetZone,
        targetZones: targetCards.length > 1 ? repeatZone(targetZone, targetCards.length) : undefined,
        followUpCard: sourceCard,
        raw: trimmed,
      };
    }
  }

  const activateSelfSummonMatch = trimmed.match(
    /activate\s+\[([^\]]+)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:,?\s*and\s+|to\s+)?special\s+summon\s+(?:itself|it|\[([^\]]+)\])(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateSelfSummonMatch) {
    const [, sourceCard, rawSourceZone, explicitTargetCard, rawTargetZone] = activateSelfSummonMatch;
    const targetCard = explicitTargetCard || sourceCard;
    const sourceZone = rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard);
    const targetZone = rawTargetZone
      ? normalizeZone(rawTargetZone)
      : targetCard === sourceCard
        ? sourceZone
        : findCardZone(trimmed, targetCard);

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Special Summon'],
      sourceCard,
      sourceZone,
      targetCard,
      targetZone,
      raw: trimmed,
    };
  }

  const activatePrimaryThenSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?(?:(return)\s+(.+)\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)|(send)\s+(.+)\s+to\s+the?\s*(gy|graveyard)|(destroy)\s+\[(.+?)\]|(banish)\s+\[(.+?)\]|(set)\s+\[(.+?)\])\s*,?\s*(?:(?:and|then|to)\s+)?special\s+summon\s+(?:itself|it|\[(.+?)\])(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
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
      sendTargetsText,
      sendZone,
      destroyEffect,
      destroyTarget,
      banishEffect,
      banishTarget,
      setEffect,
      setTarget,
      explicitFollowUpCard,
      rawFollowUpZone,
    ] = activatePrimaryThenSummonMatch;
    const followUpCard = explicitFollowUpCard || sourceCard;

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
      sendEffect && (() => {
        const targetCards = extractCardRefs(sendTargetsText);
        const targetZone = normalizeZone(sendZone);
        return {
          label: 'Send to GY',
          targetCard: targetCards[0],
          targetCards: targetCards.length > 1 ? targetCards : undefined,
          targetOriginZone: targetCards[0] ? findCardZone(trimmed, targetCards[0]) : undefined,
          targetZone,
          targetZones: targetCards.length > 1 ? repeatZone(targetZone, targetCards.length) : undefined,
        };
      })(),
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
        targetOriginZone: 'targetOriginZone' in primaryEffect ? primaryEffect.targetOriginZone : undefined,
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

  const activateSelfBanishThenReturnMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:,?\s*)?(?:to\s+)?banish\s+(?:itself|it)\s+(?:and|then)\s+return\s+(.+?)\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)[.!]?$/i,
  );

  if (activateSelfBanishThenReturnMatch) {
    const [, bracketedSourceCard, plainSourceCard, rawSourceZone, returnTargetsText, rawReturnZone] = activateSelfBanishThenReturnMatch;
    const sourceCard = (bracketedSourceCard || plainSourceCard)?.trim();
    const returnTargets = extractCardRefs(returnTargetsText);
    const resolvedReturnTargets = returnTargets.length > 0 ? returnTargets : extractBareCardNames(returnTargetsText);

    if (sourceCard && resolvedReturnTargets.length > 0) {
      const sourceZone = rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard);
      const followUpZone = normalizeZone(rawReturnZone);

      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Banish', 'Return'],
        sourceCard,
        sourceZone,
        targetCard: sourceCard,
        targetZone: sourceZone,
        followUpCard: resolvedReturnTargets[0],
        followUpCards: resolvedReturnTargets.length > 1 ? resolvedReturnTargets : undefined,
        followUpZone,
        followUpZones: resolvedReturnTargets.length > 1 ? repeatZone(followUpZone, resolvedReturnTargets.length) : undefined,
        raw: trimmed,
      };
    }
  }

  const activateSendThenSelfSummonMatch = trimmed.match(
    /activate\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+send\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+the?\s*(gy|graveyard)\s+(?:and|to|then)\s+special\s+summon\s+(?:itself|\[(.+?)\])(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateSendThenSelfSummonMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetOriginZone, rawTargetZone, explicitFollowUpCard, rawFollowUpZone] = activateSendThenSelfSummonMatch;
    const followUpCard = explicitFollowUpCard || sourceCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Send to GY', 'Special Summon'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      targetOriginZone: normalizeZone(rawTargetOriginZone),
      followUpCard,
      followUpZone: rawFollowUpZone ? normalizeZone(rawFollowUpZone) : findCardZone(trimmed, followUpCard, followUpCard === sourceCard ? 2 : 1),
      raw: trimmed,
    };
  }

  const activateAddToHandMatch = trimmed.match(
    /activate\s+(?!.*\s+(?:and|then|to)\s+(?:add|search|special\s+summon|ss|return|send|banish|destroy|discard|detach|draw|negate|tribute|target|set|reveal)\b)(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?add\s+(.+?)(?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateAddThenDiscardMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?\s*,?\s*(?:then|and(?:\s+to)?)\s+discard\s+(?:it|\[(.+?)\])[.!]?$/i,
  );

  const activateDiscardThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?discard\s+(?:itself|it|\[(.+?)\])\s+(?:and|then)\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateRevealThenAddMatch = trimmed.match(
    /activate\s+\[(.+?)\]\s*,?\s*reveal\s+\[(.+?)\]\s*,?\s*then\s+add\s+(.+)\s+to\s+(?:the\s+|your\s+)?hand[.!]?$/i,
  );

  const activateRevealThenSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*reveal\s+(?:itself|\[(.+?)\])\s+(?:to|and)\s+special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  const activateSummonThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:and|then)\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateBanishThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+banish\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+and\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateTributeThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+tribute\s+\[(.+?)\]\s+(?:and|then)\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  const activateSendThenAddMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+send\s+\[(.+?)\]\s+to\s+the?\s*(gy|graveyard)\s+(?:and|then)\s+add\s+\[(.+?)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
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

  if (activateTributeThenAddMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      targetCard,
      followUpCard,
      rawFollowUpOriginZoneA,
      rawFollowUpOriginZoneB,
    ] = activateTributeThenAddMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Tribute', 'Add to Hand'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: findCardZone(trimmed, targetCard),
      followUpCard,
      followUpZone: 'hand',
      targetOriginZone: normalizeZone(rawFollowUpOriginZoneA || rawFollowUpOriginZoneB),
      raw: trimmed,
    };
  }

  if (activateSendThenAddMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      targetCard,
      rawTargetZone,
      followUpCard,
      rawFollowUpOriginZoneA,
      rawFollowUpOriginZoneB,
    ] = activateSendThenAddMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Send to GY', 'Add to Hand'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
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

  if (activateSummonThenAddMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      targetCard,
      rawTargetZone,
      followUpCard,
      rawFollowUpOriginZoneA,
      rawFollowUpOriginZoneB,
    ] = activateSummonThenAddMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Special Summon', 'Add to Hand'],
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

  const activateMultiSummonMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*,?\s*(?:to\s+)?special\s+summon\s+(.+?)(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateMultiSummonMatch) {
    const [, sourceCard, rawSourceZone, summonedCardsText, rawTargetZone] = activateMultiSummonMatch;
    const targetCards = extractCardRefs(summonedCardsText);

    if (targetCards.length > 1) {
      const targetZone = rawTargetZone ? normalizeZone(rawTargetZone) : undefined;

      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Special Summon'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard: targetCards[0],
        targetCards,
        targetZone,
        targetZones: targetZone ? repeatZone(targetZone, targetCards.length) : targetCards.map((cardName) => findCardZone(trimmed, cardName)),
        raw: trimmed,
      };
    }
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

  if (activateDiscardThenAddMatch) {
    const [
      ,
      sourceCard,
      rawSourceZone,
      explicitDiscardCard,
      followUpCard,
      rawFollowUpOriginZoneA,
      rawFollowUpOriginZoneB,
    ] = activateDiscardThenAddMatch;
    const discardCard = explicitDiscardCard || sourceCard;
    const sourceZone = rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard);

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Discard', 'Add to Hand'],
      sourceCard,
      sourceZone,
      targetCard: discardCard,
      targetZone: 'gy',
      followUpCard,
      followUpZone: 'hand',
      targetOriginZone: normalizeZone(rawFollowUpOriginZoneA || rawFollowUpOriginZoneB),
      raw: trimmed,
    };
  }

  if (activateAddToHandMatch) {
    const [, sourceCard, rawSourceZone, addedCardsText, rawTargetOriginZoneA, rawTargetOriginZoneB] = activateAddToHandMatch;
    const targetOriginZone = normalizeZone(rawTargetOriginZoneA || rawTargetOriginZoneB);
    const targetCards = extractCardRefs(addedCardsText);
    const resolvedTargetCards = new RegExp(`^${SELF_REFERENCE_PATTERN}$`, 'i').test(addedCardsText.trim())
      ? [sourceCard]
      : targetCards;

    if (resolvedTargetCards.length === 0) return null;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Add to Hand'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard: resolvedTargetCards[0],
      targetCards: resolvedTargetCards.length > 1 ? resolvedTargetCards : undefined,
      targetZone: 'hand',
      targetZones: resolvedTargetCards.length > 1 ? repeatZone('hand', resolvedTargetCards.length) : undefined,
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
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?send\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+the?\s*(gy|graveyard)[.!]?$/i,
  );

  if (activateSendMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetOriginZone, rawTargetZone] = activateSendMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Send to GY'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      targetOriginZone: normalizeZone(rawTargetOriginZone),
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
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s*,)?\s+(?:to\s+)?destroy\s+((?:\[[^\]]+\]\s*(?:(?:,|and)\s*)?)+)[.!]?$/i,
  );

  if (activateDestroyMatch) {
    const [, sourceCard, targetsText] = activateDestroyMatch;
    const targetCards = extractCardRefs(targetsText);

    if (targetCards.length === 0) return null;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Destroy'],
      sourceCard,
      sourceZone: findCardZone(trimmed, sourceCard),
      targetCard: targetCards[0],
      targetCards: targetCards.length > 1 ? targetCards : undefined,
      targetZone: findCardZone(trimmed, targetCards[0]),
      targetZones: targetCards.length > 1 ? targetCards.map((cardName) => findCardZone(trimmed, cardName)) : undefined,
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

  const activateTargetReturnMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?(?:target|targeting)\s+\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:and\s+)?return\s+(?:it|\[(.+?)\])\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)[.!]?$/i,
  );

  if (activateTargetReturnMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetOriginZone, explicitReturnCard, rawReturnZone] = activateTargetReturnMatch;
    const resolvedTargetCard = explicitReturnCard || targetCard;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Target', 'Return'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard: resolvedTargetCard,
      targetZone: normalizeZone(rawReturnZone),
      targetOriginZone: rawTargetOriginZone ? normalizeZone(rawTargetOriginZone) : findCardZone(trimmed, targetCard),
      raw: trimmed,
    };
  }

  const activateReturnMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?return\s+\[(.+?)\]\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck)[.!]?$/i,
  );

  const activateMultiReturnMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?return\s+(.+?)(?:\s+to\s+(?:the\s+)?(hand|deck|extra\s+deck))?[.!]?$/i,
  );

  if (activateMultiReturnMatch) {
    const [, sourceCard, rawSourceZone, targetsText, rawTargetZone] = activateMultiReturnMatch;
    const targetCards = extractCardRefs(targetsText);

    if (targetCards.length > 1) {
      const targetZone = rawTargetZone ? normalizeZone(rawTargetZone) : undefined;

      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Return'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard: targetCards[0],
        targetCards,
        targetZone,
        targetZones: targetZone ? repeatZone(targetZone, targetCards.length) : undefined,
        raw: trimmed,
      };
    }
  }

  if (activateReturnMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetZone] = activateReturnMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Return'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: normalizeZone(rawTargetZone),
      raw: trimmed,
    };
  }

  const activateSetMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?(?:\s*,)?\s+(?:to\s+)?set\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateSetMatch) {
    const [, sourceCard, rawSourceZone, targetCard, rawTargetZone] = activateSetMatch;

    return {
      type: 'activate',
      label: 'Activate',
      labels: ['Activate', 'Set'],
      sourceCard,
      sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
      targetCard,
      targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
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

  const activateSelfSetMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+(?:,?\s*)?(?:to\s+)?set\s+(?:itself|it)[.!]?$/i,
  );

  if (activateSelfSetMatch) {
    const [, bracketedSourceCard, plainSourceCard, rawSourceZone] = activateSelfSetMatch;
    const sourceCard = (bracketedSourceCard || plainSourceCard)?.trim();

    if (sourceCard) {
      return {
        type: 'activate',
        label: 'Activate',
        labels: ['Activate', 'Set'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard: sourceCard,
        targetZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        raw: trimmed,
      };
    }
  }

  const simpleActivateEffectStep = parseSimpleActivateEffectStep(trimmed);
  if (simpleActivateEffectStep) return simpleActivateEffectStep;

  const activateGenericTwoWayMatch = trimmed.match(
    /^activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(.+?))(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*(?:,?\s*)?(?:to\s+)?(.+?)[.!]?$/i,
  );

  if (activateGenericTwoWayMatch) {
    const [, bracketedSourceCard, plainSourceCard, rawSourceZone, clauseText] = activateGenericTwoWayMatch;
    const sourceCard = (bracketedSourceCard || plainSourceCard)?.trim();
    const clause = sourceCard ? parseActivateClause(clauseText, sourceCard, trimmed) : null;

    if (sourceCard && clause) {
      return comboActionFromActivateClauses(
        sourceCard,
        rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        [clause],
        trimmed,
      );
    }
  }

  const activateActionMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\]\s+to\s+(destroy|banish|discard|set|return|special\s+summon|search|target)\s+\[(.+?)\](?:\s+(?:to|from)\s+the?\s*(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?/i,
  );

  if (activateActionMatch) {
    const [, sourceCard, rawEffect, targetCard, rawZone] = activateActionMatch;
    const normalizedEffect = rawEffect.toLowerCase();
    const effectMeta: Record<string, { type: ComboAction['type']; label: string }> = {
      destroy: { type: 'destroy', label: 'Destroy' },
      banish: { type: 'banish', label: 'Banish' },
      discard: { type: 'discard', label: 'Discard' },
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

  const activateBareActionMatch = trimmed.match(
    /activate\s+(?:the\s+effect\s+of\s+)?(.+?)(?:\s+(?:from|in)\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+to\s+(destroy|banish|discard|set|return|special\s+summon|search|target)\s+(.+?)(?:\s+(?:to|from)\s+the?\s*(hand|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (activateBareActionMatch && !trimmed.includes('[')) {
    const [, sourceCard, rawSourceZone, rawEffect, targetCard, rawTargetZone] = activateBareActionMatch;
    const normalizedEffect = rawEffect.toLowerCase();
    const effectMeta: Record<string, { type: ComboAction['type']; label: string }> = {
      destroy: { type: 'destroy', label: 'Destroy' },
      banish: { type: 'banish', label: 'Banish' },
      discard: { type: 'discard', label: 'Discard' },
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
        sourceCard: sourceCard.trim(),
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard.trim()),
        targetCard: targetCard.trim(),
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard.trim()),
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
  const discardThenAddMatch = trimmed.match(
    /^discard\s+\[([^\]]+)\]\s+(?:and|then)\s+add\s+\[([^\]]+)\](?:(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+to\s+(?:the\s+|your\s+)?hand)|(?:\s+from\s+(?:the\s+)?(deck|gy|graveyard|banished(?:\s+zone)?|banishment)))?[.!]?$/i,
  );

  if (discardThenAddMatch) {
    const [, sourceCard, targetCard, rawTargetOriginZoneA, rawTargetOriginZoneB] = discardThenAddMatch;

    return {
      type: 'discard',
      label: 'Discard',
      labels: ['Discard', 'Add to Hand'],
      sourceCard,
      sourceZone: 'gy',
      targetCard,
      targetZone: 'hand',
      targetOriginZone: normalizeZone(rawTargetOriginZoneA || rawTargetOriginZoneB),
      raw: trimmed,
    };
  }

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

  const genericLeadingClause = parseLeadingChainClause(trimmed);
  if (genericLeadingClause) {
    const splitClauses = splitChainRemainder(genericLeadingClause.remainder);

    if (splitClauses) {
      const secondClause = parseActivateClause(splitClauses.secondClause, genericLeadingClause.sourceCard, trimmed);
      const thirdClause = parseActivateClause(splitClauses.thirdClause, genericLeadingClause.sourceCard, trimmed);

      if (secondClause && thirdClause && (thirdClause.label === 'Add to Hand' || thirdClause.label === 'Special Summon')) {
        return {
          type: thirdClause.label === 'Special Summon' ? 'summon' : secondClause.label === 'Add to Hand' ? 'search' : 'generic',
          label: genericLeadingClause.label,
          labels: [genericLeadingClause.label, secondClause.label, thirdClause.label],
          sourceCard: genericLeadingClause.sourceCard,
          sourceZone: genericLeadingClause.sourceZone,
          targetCard: secondClause.targetCard,
          targetCards: secondClause.targetCards,
          targetZone: secondClause.targetZone,
          targetZones: secondClause.targetZones,
          followUpCard: thirdClause.targetCard,
          followUpCards: thirdClause.targetCards,
          followUpZone: thirdClause.targetZone,
          followUpZones: thirdClause.targetZones,
          targetOriginZone: thirdClause.targetOriginZone,
          raw: trimmed,
        };
      }
    }
  }

  const normalIntoActivateSpecialMatch = trimmed.match(
    /^(?:normal|flip)\s+summon\s+\[(.+?)\]\s*(?:,?\s*(?:and\s+)?)activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
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
    /^(?:normal|flip)\s+summon\s+\[(.+?)\]\s*(?:,?\s*(?:and\s+)?)?(?:(?:activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[(.+?)\]|\[(.+?)\])\s+to\s+)?)(?:add|search)\s+\[(.+?)\]\s+(?:to\s+(?:the\s+|your\s+)?hand|from\s+(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)[.!]?$/i,
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

  const specialIntoActivateAddMatch = trimmed.match(
    /^(?:special\s+summon|ss)\s+(?:\[([^\]]+)\]|([^,\n.!]+?))(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s*(?:,?\s*(?:and\s+)?)?activate\s+(?:it|its\s+effect|the\s+effect\s+of\s+\[([^\]]+)\]|\[([^\]]+)\])\s+to\s+(?:add|search)\s+\[([^\]]+)\]\s+(?:to\s+(?:the\s+|your\s+)?hand|from\s+(deck|gy|graveyard|banished(?:\s+zone)?|banishment)\s+to\s+(?:the\s+|your\s+)?hand)[.!]?$/i,
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

  if (specialIntoActivateAddMatch) {
    const [
      ,
      bracketedFirstCard,
      bareFirstCard,
      rawSourceZone,
      effectCardA,
      effectCardB,
      targetCard,
      rawTargetOriginZone,
    ] = specialIntoActivateAddMatch;
    const firstCard = (bracketedFirstCard || bareFirstCard)?.trim();
    const sourceCard = effectCardA || effectCardB || firstCard;

    if (sourceCard) {
      return {
        type: 'activate',
        label: 'Special Summon',
        labels: ['Special Summon', 'Activate', 'Add to Hand'],
        sourceCard,
        sourceZone: rawSourceZone ? normalizeZone(rawSourceZone) : findCardZone(trimmed, sourceCard),
        targetCard,
        targetZone: 'hand',
        targetOriginZone: normalizeZone(rawTargetOriginZone),
        raw: trimmed,
      };
    }
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

function parseDirectMultiSummonStep(trimmed: string): ComboAction | null {
  const multiPendulumSummonMatch = trimmed.match(
    /^pendulum\s+summon\s+(\[[^\]]+\](?:\s*(?:,|and)\s*\[[^\]]+\])+)(?:\s+from\s+(?:the\s+)?(hand|extra\s+deck|deck|gy|graveyard|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (multiPendulumSummonMatch) {
    const [, targetsText, rawTargetZone] = multiPendulumSummonMatch;
    const targetCards = extractCardRefs(targetsText);

    if (targetCards.length > 1) {
      const targetZone = rawTargetZone ? normalizeZone(rawTargetZone) : undefined;

      return {
        type: 'pendulum',
        label: 'Pendulum Summon',
        sourceCard: targetCards[0],
        targetCard: targetCards[0],
        targetCards,
        targetZone,
        targetZones: targetZone ? repeatZone(targetZone, targetCards.length) : targetCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetOnly: true,
        raw: trimmed,
      };
    }
  }

  const summonByBanishMatch = trimmed.match(
    /^special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+by\s+banishing\s+(.+?)(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?[.!]?$/i,
  );

  if (summonByBanishMatch) {
    const [, targetCard, rawTargetZone, materialsText, rawMaterialZone] = summonByBanishMatch;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      const materialZone = normalizeZone(rawMaterialZone);
      return {
        type: 'summon',
        label: 'Special Summon',
        labels: ['Banish', 'Special Summon'],
        sourceCard: targetCard,
        sourceZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        sourceCards,
        sourceZones: materialZone ? repeatZone(materialZone, sourceCards.length) : sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const summonBySendMatch = trimmed.match(
    /^special\s+summon\s+\[(.+?)\](?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment))?\s+by\s+sending\s+(.+?)\s+to\s+(?:the\s+)?(gy|graveyard)[.!]?$/i,
  );

  if (summonBySendMatch) {
    const [, targetCard, rawTargetZone, materialsText, rawMaterialZone] = summonBySendMatch;
    const sourceCards = extractCardRefs(materialsText);

    if (sourceCards.length > 0) {
      const materialZone = normalizeZone(rawMaterialZone);
      return {
        type: 'summon',
        label: 'Special Summon',
        labels: ['Send to GY', 'Special Summon'],
        sourceCard: targetCard,
        sourceZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        sourceCards,
        sourceZones: materialZone ? repeatZone(materialZone, sourceCards.length) : sourceCards.map((cardName) => findCardZone(trimmed, cardName)),
        targetCard,
        targetZone: rawTargetZone ? normalizeZone(rawTargetZone) : findCardZone(trimmed, targetCard),
        raw: trimmed,
      };
    }
  }

  const multiSpecialSummonMatch = trimmed.match(
    /^special\s+summon\s+(\[[^\]]+\](?:\s*(?:,|and)\s*\[[^\]]+\])+)(?:\s+from\s+(?:the\s+)?(hand|deck|gy|graveyard|extra\s+deck|banished(?:\s+zone)?|banishment|banished\s+zone))?[.!]?$/i,
  );

  if (!multiSpecialSummonMatch) return null;

  const [, targetsText, rawTargetZone] = multiSpecialSummonMatch;
  const targetCards = extractCardRefs(targetsText);
  if (targetCards.length <= 1) return null;

  const targetZone = rawTargetZone ? normalizeZone(rawTargetZone) : undefined;

  return {
    type: 'summon',
    label: 'Special Summon',
    sourceCard: targetCards[0],
    targetCard: targetCards[0],
    targetCards,
    targetZone,
    targetZones: targetZone ? repeatZone(targetZone, targetCards.length) : targetCards.map((cardName) => findCardZone(trimmed, cardName)),
    targetOnly: true,
    raw: trimmed,
  };
}

function parseScaleActivateStep(trimmed: string): ComboAction | null {
  const scaleActivateMatch = trimmed.match(
    /^(?:(?:scale\s+\[([^\]]+)\])|(?:put\s+\[([^\]]+)\]\s+(?:as\s+a\s+scale|on\s+the\s+(left|right)\s+scale)))\s*(?:,?\s*and\s+|,\s*)activate\s+(?:the\s+effect\s+of\s+)?(?:\[([^\]]+)\]|(?:it|its\s+effect|her|her\s+effect|him|his\s+effect))\s+(?:to\s+)?(.+?)[.!]?$/i,
  );

  if (!scaleActivateMatch) return null;

  const [, scaledCardA, scaledCardB, explicitSide, activatedCard, effectText] = scaleActivateMatch;
  const sourceCard = scaledCardA || scaledCardB;
  const resolvedActivatedCard = activatedCard || sourceCard;

  if (!sourceCard || resolvedActivatedCard.toLowerCase() !== sourceCard.toLowerCase()) return null;

  const activateStep = parseActivateEffectStep(`Activate [${sourceCard}] to ${effectText}`);
  if (!activateStep || !activateStep.labels || activateStep.labels.length < 2) return null;

  const effectLabels = activateStep.labels.filter((label) => label !== 'Activate');

  return {
    type: 'scale',
    label: 'Scale',
    labels: ['Scale', 'Activate', ...effectLabels],
    sourceCard,
    sourceZone: findCardZone(trimmed, sourceCard),
    sourceCards: [sourceCard],
    sourceZones: [findCardZone(trimmed, sourceCard)],
    scaleSides: explicitSide ? [explicitSide.toLowerCase() as ScaleSide] : undefined,
    targetCard: activateStep.targetCard,
    targetCards: activateStep.targetCards,
    targetZone: activateStep.targetZone,
    targetZones: activateStep.targetZones,
    targetOriginZone: activateStep.targetOriginZone,
    followUpCard: activateStep.followUpCard,
    followUpCards: activateStep.followUpCards,
    followUpZone: activateStep.followUpZone,
    followUpZones: activateStep.followUpZones,
    raw: trimmed,
  };
}

function parseNormalSummonActivateStep(trimmed: string): ComboAction | null {
  const normalSummonActivateMatch = trimmed.match(new RegExp(
    `^(?:normal|flip)\\s+summon\\s+\\[([^\\]]+)\\]\\s*(?:,?\\s*(?:and\\s+)?)?(?:activate|use)\\s+${ACTIVATED_REFERENCE_PATTERN}\\s+(?:to\\s+)?(.+?)[.!]?$`,
    'i',
  ));

  if (!normalSummonActivateMatch) return null;

  const [, sourceCard, effectText] = normalSummonActivateMatch;
  const activateStep = parseActivateEffectStep(`Activate [${sourceCard}] to ${effectText}`);
  if (!activateStep || !activateStep.labels || activateStep.labels.length < 2) return null;

  return {
    ...activateStep,
    label: 'Normal Summon',
    labels: ['Normal Summon', ...activateStep.labels],
    sourceCard,
    sourceZone: 'hand',
    raw: trimmed,
  };
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
  const fieldSpellStep = parseFieldSpellStep(trimmed);
  if (fieldSpellStep) return fieldSpellStep;
  const multiTargetStep = parseMultiTargetStep(trimmed);
  if (multiTargetStep) return multiTargetStep;
  const normalSummonActivateStep = parseNormalSummonActivateStep(trimmed);
  if (normalSummonActivateStep) return normalSummonActivateStep;
  const sequentialCompoundStep = parseSequentialCompoundStep(trimmed);
  if (sequentialCompoundStep) return sequentialCompoundStep;
  const scaleActivateStep = parseScaleActivateStep(trimmed);
  if (scaleActivateStep) return scaleActivateStep;
  const materialSummonStep = parseMaterialSummonStep(trimmed);
  if (materialSummonStep) return materialSummonStep;
  const ritualSummonStep = parseRitualSummonStep(trimmed);
  if (ritualSummonStep) return ritualSummonStep;
  const directMultiSummonStep = parseDirectMultiSummonStep(trimmed);
  if (directMultiSummonStep) return directMultiSummonStep;
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

  const actions = normalizedText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map((line) => {
      const { text: pathStrippedLine, stepPath } = stripLeadingStepPath(line);
      const { text: strippedLine, chainLink } = stripLeadingMetadata(pathStrippedLine);
      const parsingLine = stripCustomStepTagsForParsing(stripCardTagsForParsing(strippedLine));
      const expandedLine = normalizeRepeatedZoneArticles(expandSummonShorthand(parsingLine));
      const displayRaw = expandSummonShorthand(strippedLine);
      const phase = detectPhase(line);
      const parsedAction = { ...parseComboStep(stripLeadingPhaseForParsing(expandedLine)), raw: displayRaw };
      const withPhase = phase ? { ...parsedAction, phase } : parsedAction;
      const withChainLink = chainLink ? { ...withPhase, chainLink, chainLinkExplicit: true } : withPhase;
      const finalAction = assignScaleSides(stepPath ? { ...withChainLink, stepPath } : withChainLink, currentScales);
      return finalAction;
    });

  let currentBaseStep = 0;
  return actions.map((action) => {
    if (action.stepPath) {
      currentBaseStep = Math.max(currentBaseStep, action.stepPath.baseStep);
      return action;
    }

    currentBaseStep += 1;
    return {
      ...action,
      stepPath: {
        label: String(currentBaseStep),
        baseStep: currentBaseStep,
      },
    };
  });
}

export function getComboBranchGroups(actions: ComboAction[]): ComboBranchGroup[] {
  const routeIndicesByBase = new Map<number, Map<number, number[]>>();

  actions.forEach((action, actionIndex) => {
    const { baseStep, route } = action.stepPath ?? {};
    if (baseStep === undefined || route === undefined) return;

    const routes = routeIndicesByBase.get(baseStep) ?? new Map<number, number[]>();
    routes.set(route, [...(routes.get(route) ?? []), actionIndex]);
    routeIndicesByBase.set(baseStep, routes);
  });

  return [...routeIndicesByBase.entries()]
    .sort(([left], [right]) => left - right)
    .map(([baseStep, routes]) => {
      const routeActionIndices = [...routes.values()].flat();
      const firstRouteIndex = Math.min(...routeActionIndices);
      const lastRouteIndex = Math.max(...routeActionIndices);
      const exactBranchActionIndex = actions.findIndex(
        (action, index) => index < firstRouteIndex && action.stepPath?.baseStep === baseStep && action.stepPath.route === undefined,
      );
      const fallbackBranchActionIndex = actions.reduce<number | undefined>((found, action, index) => {
        if (index >= firstRouteIndex || action.stepPath?.route !== undefined) return found;
        return index;
      }, undefined);
      const mergeActionIndex = actions.findIndex(
        (action, index) => (
          index > lastRouteIndex &&
          action.stepPath?.route === undefined &&
          (action.stepPath?.baseStep === undefined || action.stepPath.baseStep > baseStep)
        ),
      );

      return {
        baseStep,
        branchActionIndex: exactBranchActionIndex >= 0 ? exactBranchActionIndex : fallbackBranchActionIndex,
        mergeActionIndex: mergeActionIndex >= 0 ? mergeActionIndex : undefined,
        routes: [...routes.entries()]
          .sort(([left], [right]) => left - right)
          .map(([route, actionIndices]) => ({ route, actionIndices })),
      };
    });
}

export function getVisibleComboActionIndices(
  actions: ComboAction[],
  selectedRoutes: Partial<Record<number, number>>,
): number[] {
  return actions.flatMap((action, index) => {
    const { baseStep, route } = action.stepPath ?? {};
    if (baseStep === undefined || route === undefined) return [index];
    return selectedRoutes[baseStep] === route ? [index] : [];
  });
}
