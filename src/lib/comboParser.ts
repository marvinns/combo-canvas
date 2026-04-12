export interface ComboAction {
  type: 'summon' | 'send-gy' | 'activate' | 'search' | 'banish' | 'draw' | 'set' | 'tribute' | 'link' | 'xyz' | 'synchro' | 'fusion' | 'return' | 'negate' | 'destroy' | 'discard' | 'detach' | 'generic';
  label: string;
  labels?: string[];
  sourceCard: string;
  targetCard?: string;
  raw: string;
}

const ACTION_PATTERNS: { pattern: RegExp; type: ComboAction['type']; label: string }[] = [
  // Summon patterns
  { pattern: /(?:normal|flip)\s+summon\s+\[(.+?)\]/i, type: 'summon', label: 'Normal Summon' },
  { pattern: /special\s+summon\s+\[(.+?)\](?:\s+(?:from|in)\s+\w+)?(?:.*?(?:and|,|then)\s+send\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard))?/i, type: 'summon', label: 'Special Summon' },
  { pattern: /(?:special\s+)?summon\s+\[(.+?)\]/i, type: 'summon', label: 'Summon' },
  
  // Send to GY
  { pattern: /\[(.+?)\]\s+sends?\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard)/i, type: 'send-gy', label: 'Send to GY' },
  { pattern: /send\s+\[(.+?)\]\s+to\s+the?\s*(?:gy|graveyard)(?:\s+(?:with|using|from|by)\s+\[(.+?)\])?/i, type: 'send-gy', label: 'Send to GY' },

  // Activate
  { pattern: /activate\s+(?:the\s+effect\s+of\s+)?\[(.+?)\](?:.*?(?:targeting|to target|on)\s+\[(.+?)\])?/i, type: 'activate', label: 'Activate' },
  { pattern: /\[(.+?)\]\s+(?:effect\s+)?activates?/i, type: 'activate', label: 'Activate' },

  // Search
  { pattern: /\[(.+?)\]\s+(?:searches|adds)\s+\[(.+?)\]/i, type: 'search', label: 'Search' },
  { pattern: /search\s+\[(.+?)\](?:\s+(?:with|using|from|by)\s+\[(.+?)\])?/i, type: 'search', label: 'Search' },
  { pattern: /add\s+\[(.+?)\]\s+(?:to\s+(?:your\s+)?hand|from\s+(?:deck|gy|graveyard))/i, type: 'search', label: 'Add to Hand' },

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

  // Extra deck summons
  { pattern: /link\s+summon\s+\[(.+?)\]/i, type: 'link', label: 'Link Summon' },
  { pattern: /xyz\s+summon\s+\[(.+?)\]/i, type: 'xyz', label: 'Xyz Summon' },
  { pattern: /synchro\s+summon\s+\[(.+?)\]/i, type: 'synchro', label: 'Synchro Summon' },
  { pattern: /fusion\s+summon\s+\[(.+?)\]/i, type: 'fusion', label: 'Fusion Summon' },
  { pattern: /tribute\s+(?:summon\s+)?\[(.+?)\]/i, type: 'tribute', label: 'Tribute' },
];

export function parseComboStep(line: string): ComboAction {
  const trimmed = line.trim();
  
  for (const { pattern, type, label } of ACTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      // Handle special summon + send to GY combo
      if (type === 'summon' && label === 'Special Summon' && match[2]) {
        return {
          type: 'send-gy',
          label: 'Special Summon',
          labels: ['Special Summon', 'Send to GY'],
          sourceCard: match[1],
          targetCard: match[2],
          raw: trimmed,
        };
      }

      // For send-gy where source/target might be swapped
      if (type === 'send-gy' && !match[2]) {
        return { type, label, sourceCard: match[1], raw: trimmed };
      }
      if (type === 'send-gy' && trimmed.toLowerCase().startsWith('send')) {
        return { type, label, sourceCard: match[2] || match[1], targetCard: match[1], raw: trimmed };
      }

      return {
        type,
        label,
        sourceCard: match[1],
        targetCard: match[2],
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
    targetCard: cardRefs[1],
    raw: trimmed,
  };
}

export function parseCombo(text: string): ComboAction[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(parseComboStep);
}
