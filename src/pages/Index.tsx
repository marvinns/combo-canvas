import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { getComboBranchGroups, getVisibleComboActionIndices, parseCombo, type ComboAction, type ComboBranchGroup } from '@/lib/comboParser';
import { ComboStepVisual } from '@/components/ComboStepVisual';
import { ComboLibrary } from '@/components/ComboLibrary';
import { CHAIN_LINK_BG_CLASS, CHAIN_LINK_BORDER_CLASS, CHAIN_LINK_TEXT_CLASS, ChainLinkIcon, EFFECT_STYLES, EffectGlyph, PHASE_BG_CLASS, PHASE_BORDER_CLASS, PHASE_TEXT_CLASS, PhaseIcon } from '@/components/ActionIcon';
import { getDeckCards, getSavedCombos, updateCombo, validateDeckAssignment, type DeckAssignment, type DeckSection, type SavedCombo } from '@/lib/comboLibrary';
import { ChevronLeft, ChevronRight, Expand, Link2, Minimize2, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatedGradientText } from '@/components/AnimatedGradientText';
import { SideRays } from '@/components/SideRays';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCardImage, useRelatedCards } from '@/hooks/useCardImage';
import { cn } from '@/lib/utils';

const EXAMPLE_COMBO = `Special Summon [Diabellze the White Witch] from hand and send [Susurrus of the Sinful Spoils] to the Graveyard
Activate [Susurrus of the Sinful Spoils] targeting [Diabellze the White Witch]
Search [Guiding Light] from deck`;

const PRESETS = [
  'Normal Summon [Card]',
  'Special Summon [Card]',
  'Ritual Summon [Card A] using [Card B]',
  'Link Summon [Card]',
  'Xyz Summon [Card]',
  'Xyz Summon [Card A] using [Card B] and [Card C]',
  'Synchro Summon [Card]',
  'Synchro Summon [Card A] using [Card B] and [Card C]',
  'Fusion Summon [Card]',
  'Fuse [Card A] and [Card B] into [Card C]',
  'Activate [Card]',
  'Activate [Card] targeting [Card]',
  '[Card] sends [Card] to the GY',
  'Search [Card] from deck',
  'Add [Card] to hand',
  'Set [Card]',
  'Discard [Card]',
  'Banish [Card]',
  'Detach [Card]',
  'Destroy [Card]',
  '[Card] negates [Card]',
  'Return [Card] to hand',
  'Tribute [Card]',
];

const COMMON_COMBO_AUTOCOMPLETE_PHRASES = [
  'Normal Summon [card]',
  'Special Summon [card]',
  'Synchro Summon [card] using [card] and [card]',
  'Fusion Summon [card] using [card] and [card]',
  'Xyz Summon [card] using [card] and [card]',
  'Link Summon [card] using [card]',
  'Activate [card]',
  'Activate [card] targeting [card]',
  'Search [card] from deck',
  'Add [card] to hand',
  'Banish [card]',
  'Send [card] to the GY',
  'Set [card]',
  'Discard [card]',
  'Tribute [card]',
];

const SHORTCUT_GROUPS = [
  {
    title: 'Editor',
    items: [
      { keys: ['Cmd', 'S'], description: 'Save the active combo' },
      { keys: ['Ctrl', 'V'], description: 'Visualize the full combo' },
      { keys: ['Ctrl'], description: 'Visualize the selected line' },
      { keys: ['Alt', '['], description: 'Wrap selected text as a card' },
      { keys: ['Cmd/Ctrl', 'B'], description: 'Bold selected text' },
      { keys: ['Enter'], description: 'Insert a new line' },
      { keys: ['Right'], description: 'Accept inline autocomplete' },
    ],
  },
  {
    title: 'Syntax',
    items: [
      { keys: ['"Tag"'], description: 'Add a custom step tag' },
      { keys: ['(Badge)', '[Card]'], description: 'Add a custom card badge before a card' },
      { keys: ['[Card]', '(Badge)'], description: 'Add a custom card badge after a card' },
      { keys: ['11.2a'], description: 'Add route 2 substep a after shared step 11' },
    ],
  },
  {
    title: 'Card Suggestions',
    items: [
      { keys: ['Up/Down'], description: 'Move through suggestions' },
      { keys: ['Enter/Tab'], description: 'Apply the selected suggestion' },
      { keys: ['Esc'], description: 'Close suggestions' },
    ],
  },
  {
    title: 'Breakdown',
    items: [
      { keys: ['Left/Right'], description: 'Move between combo steps' },
      { keys: ['Alt', 'Z'], description: 'Jump to the final step' },
      { keys: ['Enter'], description: 'Jump from the step input' },
      { keys: ['Click'], description: 'Select a step dot' },
      { keys: ['Click'], description: 'Open full mode' },
      { keys: ['Swipe'], description: 'Move between steps in mobile full mode' },
    ],
  },
  {
    title: 'Comments',
    items: [
      { keys: ['Click'], description: 'Add or edit the active step comment' },
      { keys: ['Drag'], description: 'Move a comment marker' },
      { keys: ['Resize'], description: 'Change the comment panel width' },
      { keys: ['Click away'], description: 'Save and close a comment' },
      { keys: ['Trash'], description: 'Delete a comment' },
    ],
  },
  {
    title: 'Links',
    items: [
      { keys: ['Plus Link'], description: 'Create a combo or step link' },
      { keys: ['Select'], description: 'Choose the target combo' },
      { keys: ['Select'], description: 'Choose the exact target step' },
      { keys: ['Drag'], description: 'Move a link badge' },
      { keys: ['Click label'], description: 'Rename a link badge' },
      { keys: ['Link icon'], description: 'Open the linked step' },
    ],
  },
  {
    title: 'Endboard',
    items: [
      { keys: ['Click'], description: 'Add or change a card in a slot' },
      { keys: ['Type'], description: 'Search known and YGOPRO card names' },
      { keys: ['Click'], description: 'Select a search result' },
      { keys: ['Drag'], description: 'Move or swap cards between slots' },
      { keys: ['Trash'], description: 'Remove a card from a slot' },
    ],
  },
  {
    title: 'Cards',
    items: [
      { keys: ['Double-click'], description: 'Open full-art view' },
      { keys: ['Enter/Space'], description: 'Open full-art view for focused combo cards' },
      { keys: ['Plus'], description: 'Show or hide related cards in full-art view' },
      { keys: ['Click'], description: 'Preview a related card' },
    ],
  },
];

const SYMBOL_GUIDE: Array<{ type: ComboAction['type']; name: string }> = [
  { type: 'activate', name: 'Activate' },
  { type: 'banish', name: 'Banish' },
  { type: 'destroy', name: 'Destroy' },
  { type: 'detach', name: 'Detach' },
  { type: 'discard', name: 'Discard' },
  { type: 'draw', name: 'Draw' },
  { type: 'fusion', name: 'Fusion Summon' },
  { type: 'link', name: 'Link Summon' },
  { type: 'negate', name: 'Negate' },
  { type: 'continuous', name: 'Continuous Spell / Trap Zone' },
  { type: 'pendulum', name: 'Pendulum Summon' },
  { type: 'reveal', name: 'Reveal' },
  { type: 'return', name: 'Return' },
  { type: 'ritual', name: 'Ritual Summon' },
  { type: 'scale', name: 'Scale' },
  { type: 'search', name: 'Search / Add to Hand' },
  { type: 'send-gy', name: 'Send to GY' },
  { type: 'set', name: 'Set' },
  { type: 'synchro', name: 'Synchro Summon' },
  { type: 'target', name: 'Target' },
  { type: 'tribute', name: 'Tribute' },
  { type: 'xyz', name: 'Xyz Summon' },
];

const PHASE_GUIDE = { name: 'Phase' };
const ENDBOARD_DRAG_DATA_TYPE = 'application/x-combo-endboard-slot';

type StepComment = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type StepLink = {
  id: string;
  label: string;
  targetComboId: string | null;
  targetStepIndex: number;
  x: number;
  y: number;
  width: number;
};

type EditorSelectionOffsets = {
  start: number;
  end: number;
};

type CardSuggestion = {
  name: string;
  count: number;
  lastIndex: number;
  source: 'assigned-deck' | 'combo';
  deckCount?: number;
  deckSection?: DeckSection;
};

type InlineComboAutocomplete = {
  completion: string;
  caretRawOffset: number;
};

type ComboLineRange = {
  rawStart: number;
  rawEnd: number;
  renderedStart: number;
  renderedEnd: number;
  lineIndex: number;
  stepIndex: number;
};

type EndboardSlotId =
  | 'top-left'
  | 'top-right'
  | 'field-left'
  | 'field-right'
  | 'extra-left'
  | 'monster-1'
  | 'monster-2'
  | 'monster-3'
  | 'monster-4'
  | 'monster-5'
  | 'extra-right'
  | 'spell-left'
  | 'spell-1'
  | 'spell-2'
  | 'spell-3'
  | 'spell-4'
  | 'spell-5'
  | 'spell-right'
  | 'hand-1'
  | 'hand-2'
  | 'hand-3'
  | 'hand-4'
  | 'hand-5'
  | 'hand-6';

type EndboardSlotCards = string[];
type EndboardSlots = Partial<Record<EndboardSlotId, EndboardSlotCards>>;
type PersistedEndboardSlots = Partial<Record<string, string | string[]>>;
type StepLinksByStep = Record<number, StepLink[]>;

type EndboardSlotConfig = {
  id: EndboardSlotId;
  row: 1 | 2 | 3;
  col: number;
  variant?: 'extra' | 'spell' | 'field' | 'hand';
};

type YgoSearchCard = {
  name: string;
};

const ENDBOARD_SLOTS: EndboardSlotConfig[] = [
  { id: 'top-left', row: 1, col: 3, variant: 'field' },
  { id: 'top-right', row: 1, col: 5, variant: 'field' },
  { id: 'extra-left', row: 2, col: 1, variant: 'extra' },
  { id: 'monster-1', row: 2, col: 2 },
  { id: 'monster-2', row: 2, col: 3 },
  { id: 'monster-3', row: 2, col: 4 },
  { id: 'monster-4', row: 2, col: 5 },
  { id: 'monster-5', row: 2, col: 6 },
  { id: 'extra-right', row: 2, col: 7, variant: 'extra' },
  { id: 'spell-left', row: 3, col: 1, variant: 'spell' },
  { id: 'spell-1', row: 3, col: 2, variant: 'spell' },
  { id: 'spell-2', row: 3, col: 3, variant: 'spell' },
  { id: 'spell-3', row: 3, col: 4, variant: 'spell' },
  { id: 'spell-4', row: 3, col: 5, variant: 'spell' },
  { id: 'spell-5', row: 3, col: 6, variant: 'spell' },
  { id: 'spell-right', row: 3, col: 7, variant: 'spell' },
];

const ENDBOARD_HAND_SLOTS: EndboardSlotConfig[] = [
  { id: 'hand-1', row: 1, col: 1, variant: 'hand' },
  { id: 'hand-2', row: 1, col: 2, variant: 'hand' },
  { id: 'hand-3', row: 1, col: 3, variant: 'hand' },
  { id: 'hand-4', row: 1, col: 4, variant: 'hand' },
  { id: 'hand-5', row: 1, col: 5, variant: 'hand' },
  { id: 'hand-6', row: 1, col: 6, variant: 'hand' },
];

const ENDBOARD_SLOT_IDS = new Set([...ENDBOARD_SLOTS, ...ENDBOARD_HAND_SLOTS].map((slot) => slot.id));

function normalizeEndboardSlotCards(value: string | string[] | undefined): EndboardSlotCards {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((cardName) => typeof cardName === 'string' && cardName.trim() ? [cardName.trim()] : []);
}

function serializeEndboardSlotCards(cards: EndboardSlotCards): string | string[] | undefined {
  if (cards.length === 0) return undefined;
  return cards.length === 1 ? cards[0] : cards;
}

function getRouteEndboardPrefix(baseStep: number, route: number): string {
  return `route:${baseStep}:${route}:`;
}

function getScopedEndboardSlots(
  slots: PersistedEndboardSlots,
  baseStep?: number,
  route?: number,
): EndboardSlots {
  const prefix = baseStep !== undefined && route !== undefined
    ? getRouteEndboardPrefix(baseStep, route)
    : '';

  return Object.entries(slots).reduce<EndboardSlots>((scoped, [slotKey, slotCards]) => {
    const cards = normalizeEndboardSlotCards(slotCards);
    if (cards.length === 0) return scoped;
    const slotId = prefix ? slotKey.slice(prefix.length) : slotKey;
    if ((prefix && !slotKey.startsWith(prefix)) || (!prefix && slotKey.includes(':'))) return scoped;
    if (!ENDBOARD_SLOT_IDS.has(slotId as EndboardSlotId)) return scoped;
    scoped[slotId as EndboardSlotId] = cards;
    return scoped;
  }, {});
}

function replaceScopedEndboardSlots(
  allSlots: PersistedEndboardSlots,
  nextScopedSlots: EndboardSlots,
  baseStep?: number,
  route?: number,
): PersistedEndboardSlots {
  const prefix = baseStep !== undefined && route !== undefined
    ? getRouteEndboardPrefix(baseStep, route)
    : '';
  const nextSlots = Object.entries(allSlots).reduce<PersistedEndboardSlots>((result, [slotKey, slotCards]) => {
    const isCurrentScope = prefix ? slotKey.startsWith(prefix) : !slotKey.includes(':');
    if (!isCurrentScope && normalizeEndboardSlotCards(slotCards).length > 0) result[slotKey] = slotCards;
    return result;
  }, {});

  Object.entries(nextScopedSlots).forEach(([slotId, cards]) => {
    const serializedCards = serializeEndboardSlotCards(cards);
    if (serializedCards) nextSlots[`${prefix}${slotId}`] = serializedCards;
  });

  return nextSlots;
}

function normalizeEndboardSlots(slots?: SavedCombo['endboardSlots']): PersistedEndboardSlots {
  if (!slots) return {};

  return Object.entries(slots).reduce<PersistedEndboardSlots>((normalized, [slotKey, slotCards]) => {
    const routeSlotMatch = slotKey.match(/^route:\d+:\d+:(.+)$/);
    const slotId = routeSlotMatch?.[1] ?? slotKey;
    const cards = normalizeEndboardSlotCards(slotCards);
    if (!ENDBOARD_SLOT_IDS.has(slotId as EndboardSlotId) || cards.length === 0) return normalized;

    normalized[slotKey] = serializeEndboardSlotCards(cards);
    return normalized;
  }, {});
}

function normalizeStepComments(comments?: SavedCombo['stepComments']): Record<number, StepComment> {
  if (!comments) return {};

  return Object.entries(comments).reduce<Record<number, StepComment>>((normalized, [stepIndex, comment]) => {
    const numericStepIndex = Number(stepIndex);
    if (!Number.isInteger(numericStepIndex) || numericStepIndex < 0 || !comment) return normalized;

    normalized[numericStepIndex] = {
      text: comment.text ?? '',
      x: Number.isFinite(comment.x) ? comment.x : 20,
      y: Number.isFinite(comment.y) ? comment.y : 18,
      width: Number.isFinite(comment.width) ? comment.width : 260,
    };
    return normalized;
  }, {});
}

function normalizeComboLinks(links?: SavedCombo['comboLinks']): StepLinksByStep {
  if (!links) return {};

  return Object.entries(links).reduce<StepLinksByStep>((normalized, [stepIndex, stepLinks]) => {
    const numericStepIndex = Number(stepIndex);
    if (!Number.isInteger(numericStepIndex) || numericStepIndex < 0 || !Array.isArray(stepLinks)) return normalized;

    const normalizedLinks = stepLinks.flatMap((link) => {
      if (!link) return [];
      const targetStepIndex = Number(link.targetStepIndex);
      if (!Number.isInteger(targetStepIndex) || targetStepIndex < 0) return [];

      return [{
        id: link.id || crypto.randomUUID(),
        label: link.label?.trim() || 'Combo Link',
        targetComboId: link.targetComboId || null,
        targetStepIndex,
        x: Number.isFinite(link.x) ? link.x : 76,
        y: Number.isFinite(link.y) ? link.y : 18,
        width: Number.isFinite(link.width) ? link.width : 220,
      }];
    });

    if (normalizedLinks.length > 0) {
      normalized[numericStepIndex] = normalizedLinks;
    }

    return normalized;
  }, {});
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function comboTextToEditorHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function htmlNodeToComboText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\u00A0/g, ' ') || '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'br') return '\n';

  const childText = Array.from(node.childNodes).map(htmlNodeToComboText).join('');

  if (tagName === 'strong' || tagName === 'b') {
    return `**${childText}**`;
  }

  return childText;
}

function editorHtmlToComboText(container: HTMLElement): string {
  return Array.from(container.childNodes)
    .map(htmlNodeToComboText)
    .join('')
    .replace(/\n{3,}/g, '\n\n');
}

function rawOffsetToRenderedOffset(text: string, rawOffset: number): number {
  let rawIndex = 0;
  let renderedIndex = 0;

  while (rawIndex < text.length && rawIndex < rawOffset) {
    if (text.slice(rawIndex, rawIndex + 2) === '**') {
      rawIndex += 2;
      continue;
    }

    rawIndex += 1;
    renderedIndex += 1;
  }

  return renderedIndex;
}

function renderedOffsetToRawOffset(text: string, renderedOffset: number): number {
  let rawIndex = 0;
  let renderedIndex = 0;

  while (rawIndex < text.length) {
    if (text.slice(rawIndex, rawIndex + 2) === '**') {
      rawIndex += 2;
      continue;
    }

    if (renderedIndex >= renderedOffset) {
      return rawIndex;
    }

    rawIndex += 1;
    renderedIndex += 1;
  }

  return rawIndex;
}

function getCardSuggestionRange(text: string, rawSelectionStart: number, rawSelectionEnd: number): { query: string; start: number; end: number } | null {
  const beforeCursor = text.slice(0, rawSelectionStart);
  const bracketMatch = beforeCursor.match(/\[([^\]\n]*)$/);
  if (!bracketMatch) return null;

  const query = bracketMatch[1];
  const start = rawSelectionStart - query.length;
  const nextClosingBracket = text.indexOf(']', rawSelectionEnd);
  const nextLineBreak = text.indexOf('\n', rawSelectionEnd);
  const hasClosingBracketBeforeLineBreak = nextClosingBracket !== -1 && (nextLineBreak === -1 || nextClosingBracket < nextLineBreak);

  return {
    query,
    start,
    end: hasClosingBracketBeforeLineBreak ? nextClosingBracket : rawSelectionEnd,
  };
}

function incrementRouteSubstep(substep: string): string {
  const lowerSubstep = substep.toLowerCase();
  let carry = true;
  const nextLetters = lowerSubstep.split('');

  for (let index = nextLetters.length - 1; index >= 0; index -= 1) {
    if (nextLetters[index] === 'z') {
      nextLetters[index] = 'a';
      continue;
    }

    nextLetters[index] = String.fromCharCode(nextLetters[index].charCodeAt(0) + 1);
    carry = false;
    break;
  }

  return carry ? `a${nextLetters.join('')}` : nextLetters.join('');
}

function getNextRouteLineInsertion(text: string, rawSelectionStart: number, rawSelectionEnd: number): string | null {
  if (rawSelectionStart !== rawSelectionEnd) return null;

  const lineStart = text.lastIndexOf('\n', Math.max(0, rawSelectionStart - 1)) + 1;
  const lineEndIndex = text.indexOf('\n', rawSelectionStart);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const currentLine = text.slice(lineStart, lineEnd);
  const caretColumn = rawSelectionStart - lineStart;
  const textAfterCaret = currentLine.slice(caretColumn);
  if (textAfterCaret.trim().length > 0) return null;

  const routeMatch = currentLine.match(/^(\s*)(\d+\.\d+)([a-z]+)(?:[\s.,:)-]|$)/i);
  if (!routeMatch) return null;

  const [, indentation, routePrefix, substep] = routeMatch;
  return `\n${indentation}${routePrefix}${incrementRouteSubstep(substep)} `;
}

function setEditorSelectionByOffsets(container: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let currentOffset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;

  const visit = (node: Node) => {
    if (startNode && endNode) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      const nextOffset = currentOffset + textLength;

      if (!startNode && start >= currentOffset && start <= nextOffset) {
        startNode = node;
        startNodeOffset = start - currentOffset;
      }

      if (!endNode && end >= currentOffset && end <= nextOffset) {
        endNode = node;
        endNodeOffset = end - currentOffset;
      }

      currentOffset = nextOffset;
      return;
    }

    if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'br') {
      currentOffset += 1;
      return;
    }

    node.childNodes.forEach(visit);
  };

  container.childNodes.forEach(visit);

  if (!startNode || !endNode) return;

  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function clearBrowserSelection() {
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
}

function getEditorSelectionOffsets(container: HTMLElement): EditorSelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  let currentOffset = 0;
  let start: number | null = null;
  let end: number | null = null;

  const visit = (node: Node) => {
    if (start !== null && end !== null) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      const nextOffset = currentOffset + textLength;

      if (start === null && node === range.startContainer) {
        start = currentOffset + range.startOffset;
      }

      if (end === null && node === range.endContainer) {
        end = currentOffset + range.endOffset;
      }

      currentOffset = nextOffset;
      return;
    }

    if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'br') {
      if (start === null && node === range.startContainer) {
        start = currentOffset;
      }

      if (end === null && node === range.endContainer) {
        end = currentOffset;
      }

      currentOffset += 1;
      return;
    }

    node.childNodes.forEach(visit);
  };

  container.childNodes.forEach(visit);

  if (start === null || end === null) return null;
  return { start, end };
}

function getCardSuggestions(text: string, assignedDeck?: DeckAssignment): CardSuggestion[] {
  const counts = new Map<string, { count: number; lastIndex: number }>();

  for (const match of text.matchAll(/\[(.+?)\]/g)) {
    const name = match[1].trim();
    if (!name) continue;
    const current = counts.get(name);
    if (current) {
      current.count += 1;
      current.lastIndex = match.index ?? current.lastIndex;
    } else {
      counts.set(name, { count: 1, lastIndex: match.index ?? 0 });
    }
  }

  const comboSuggestions = Array.from(counts.entries())
    .map(([name, meta]) => ({ name, ...meta, source: 'combo' as const }));

  const deckSuggestions = assignedDeck && validateDeckAssignment(assignedDeck).isValid
    ? getDeckCards(assignedDeck).map((card) => ({
        name: card.name,
        count: 0,
        lastIndex: Number.MAX_SAFE_INTEGER,
        source: 'assigned-deck' as const,
        deckCount: card.count,
        deckSection: card.section,
      }))
    : [];

  const byName = new Map<string, CardSuggestion>();
  for (const suggestion of [...comboSuggestions, ...deckSuggestions]) {
    const key = suggestion.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, suggestion);
      continue;
    }

    byName.set(key, {
      ...existing,
      count: Math.max(existing.count, suggestion.count),
      lastIndex: Math.max(existing.lastIndex, suggestion.lastIndex),
      source: existing.source === 'assigned-deck' || suggestion.source === 'assigned-deck' ? 'assigned-deck' : 'combo',
      deckCount: existing.deckCount ?? suggestion.deckCount,
      deckSection: existing.deckSection ?? suggestion.deckSection,
    });
  }

  return Array.from(byName.values())
    .sort((a, b) => (
      Number(b.source === 'assigned-deck') - Number(a.source === 'assigned-deck') ||
      b.count - a.count ||
      b.lastIndex - a.lastIndex ||
      a.name.localeCompare(b.name)
    ));
}

function getSavedComboDeckName(combo: SavedCombo): string {
  return combo.assignedDeck?.name || combo.deck || 'Unassigned';
}

function getCurrentEditorLinePrefix(text: string, rawCaretOffset: number): string {
  const lineStart = text.lastIndexOf('\n', Math.max(0, rawCaretOffset - 1)) + 1;
  return text.slice(lineStart, rawCaretOffset);
}

function isCaretInsideCardToken(text: string, rawCaretOffset: number): boolean {
  const lineStart = text.lastIndexOf('\n', Math.max(0, rawCaretOffset - 1)) + 1;
  const linePrefix = text.slice(lineStart, rawCaretOffset);
  return linePrefix.lastIndexOf('[') > linePrefix.lastIndexOf(']');
}

function getInlineComboAutocomplete(
  text: string,
  rawCaretOffset: number | null,
  deckName?: string,
): InlineComboAutocomplete | null {
  if (rawCaretOffset === null || rawCaretOffset < 0) return null;
  if (isCaretInsideCardToken(text, rawCaretOffset)) return null;

  const linePrefix = getCurrentEditorLinePrefix(text, rawCaretOffset);
  const trimmedPrefix = linePrefix.trimStart();
  if (trimmedPrefix.trim().length < 2) return null;

  const afterCaret = text.slice(rawCaretOffset);
  const nextLineBreak = afterCaret.indexOf('\n');
  const textUntilLineEnd = nextLineBreak === -1 ? afterCaret : afterCaret.slice(0, nextLineBreak);
  if (textUntilLineEnd.trim().length > 0) return null;

  const normalizedPrefix = trimmedPrefix.toLowerCase();
  const seen = new Set<string>();
  const savedCandidates = deckName
    ? getSavedCombos()
        .filter((combo) => getSavedComboDeckName(combo) === deckName)
        .flatMap((combo) => combo.text.split('\n'))
        .map((line) => line.trim())
    : [];
  const candidates = [...savedCandidates, ...COMMON_COMBO_AUTOCOMPLETE_PHRASES]
    .filter((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return key.startsWith(normalizedPrefix) && candidate.length > trimmedPrefix.length;
    });

  const suggestion = candidates[0];
  if (!suggestion) return null;

  return {
    completion: suggestion.slice(trimmedPrefix.length),
    caretRawOffset: rawCaretOffset,
  };
}

async function searchYgoCards(query: string): Promise<YgoSearchCard[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(trimmedQuery)}`);
    if (!res.ok) return [];

    const data = await res.json();
    const cards = Array.isArray(data?.data) ? data.data as YgoSearchCard[] : [];
    const seen = new Set<string>();

    return cards.flatMap((card) => {
      const name = card.name?.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{ name }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}

function EndboardSlotCard({ name }: { name: string }) {
  const { data, isLoading } = useCardImage(name);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/50 p-2 text-center text-[10px] text-muted-foreground">
        {name}
      </div>
    );
  }

  return <img src={data.imageUrl} alt={data.name} className="h-full w-full object-cover" loading="lazy" />;
}

function EndboardCardPreview({ cardName, onOpenChange }: { cardName: string | null; onOpenChange: (isOpen: boolean) => void }) {
  const [previewCardName, setPreviewCardName] = useState(cardName || '');
  const [showRelatedCards, setShowRelatedCards] = useState(false);
  const { data, isLoading } = useCardImage(previewCardName);
  const {
    data: relatedCardsData,
    isLoading: areRelatedCardsLoading,
  } = useRelatedCards(data?.name || previewCardName, Boolean(cardName) && showRelatedCards);
  const cardLabel = data?.name || previewCardName || cardName || '';

  useEffect(() => {
    setPreviewCardName(cardName || '');
    setShowRelatedCards(false);
  }, [cardName]);

  return (
    <Dialog open={Boolean(cardName)} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black/95 p-3 sm:rounded-none sm:p-6">
        <DialogTitle className="sr-only">{cardLabel}</DialogTitle>
        <DialogDescription className="sr-only">Full screen preview for {cardLabel}</DialogDescription>
        <div className="flex h-full w-full items-stretch justify-center gap-4 overflow-hidden">
          <div className="relative flex min-w-0 flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setShowRelatedCards((current) => !current)}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-5 sm:top-5"
              aria-label={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
              title={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
            >
              <Plus className={cn('h-5 w-5 transition-transform duration-200', showRelatedCards && 'rotate-45')} strokeWidth={2.3} />
            </button>
            {isLoading ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              </div>
            ) : data ? (
              <img
                src={data.imageUrl}
                alt={data.name}
                className="h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)]"
              />
            ) : (
              <div className="flex h-[min(calc(100dvh-2rem),720px)] w-[min(86vw,520px)] items-center justify-center rounded-[28px] border border-white/15 bg-white/5 p-8 text-center text-xl text-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[min(calc(100dvh-3rem),720px)]">
                {cardLabel}
              </div>
            )}
          </div>
          {showRelatedCards && (
            <aside className="flex h-full w-[min(34vw,360px)] min-w-[260px] flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md max-md:absolute max-md:inset-x-3 max-md:bottom-3 max-md:h-[42dvh] max-md:w-auto max-md:min-w-0">
              <div className="shrink-0 border-b border-white/10 pb-3">
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-white/45">Related cards</p>
                <p className="mt-1 line-clamp-2 text-sm font-display font-semibold text-white/90">
                  {relatedCardsData?.archetype || cardLabel}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                {areRelatedCardsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  </div>
                ) : relatedCardsData?.cards.length ? (
                  <div className="space-y-3">
                    {relatedCardsData.cards.map((card) => (
                      <button
                        type="button"
                        key={card.id}
                        onClick={() => setPreviewCardName(card.name)}
                        className={cn(
                          'group rounded-lg border bg-black/20 p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                          card.name === cardLabel ? 'border-white/45 bg-white/12' : 'border-white/10',
                        )}
                      >
                        <img
                          src={card.thumbnailUrl}
                          alt={card.name}
                          className="aspect-[0.686] w-full rounded-md object-cover"
                          loading="lazy"
                        />
                        <span className="mt-1.5 block line-clamp-2 text-[11px] font-body leading-tight text-white/75 group-hover:text-white">
                          {card.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 p-5 text-center text-sm text-white/60">
                    No related cards found for this card.
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EndboardSlot({
  slot,
  cardNames,
  onPick,
  onPreview,
  onBrowse,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  slot: EndboardSlotConfig;
  cardNames: string[];
  onPick: () => void;
  onPreview: () => void;
  onBrowse: () => void;
  onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const cardName = cardNames[cardNames.length - 1];
  const isFieldSlot = slot.variant === 'field';
  const isSpellSlot = slot.variant === 'spell';
  const isHandSlot = slot.variant === 'hand';
  const pickTimeoutRef = useRef<number | null>(null);

  const clearPickTimeout = () => {
    if (pickTimeoutRef.current === null) return;
    window.clearTimeout(pickTimeoutRef.current);
    pickTimeoutRef.current = null;
  };

  const handlePickClick = () => {
    if (!cardName) {
      onPick();
      return;
    }

    clearPickTimeout();
    pickTimeoutRef.current = window.setTimeout(() => {
      pickTimeoutRef.current = null;
      onPick();
    }, 220);
  };

  const handlePreview = () => {
    if (!cardName) return;

    clearPickTimeout();
    onPreview();
  };

  useEffect(() => clearPickTimeout, []);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        slot.row === 1 && 'self-end',
      )}
      style={{ gridColumn: slot.col, gridRow: slot.row }}
    >
      <div
        draggable={Boolean(cardName)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          'group relative aspect-[0.686] w-full max-w-[96px] overflow-hidden rounded-[3px] border bg-black/60 shadow-[0_0_24px_rgba(0,0,0,0.45)] transition-all',
          cardName && 'cursor-grab active:cursor-grabbing',
          isFieldSlot
            ? 'border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.12)]'
            : isSpellSlot
              ? 'border-blue-500/55 shadow-[0_0_18px_rgba(0,72,255,0.22)]'
              : isHandSlot
                ? 'border-amber-300/55 shadow-[0_0_18px_rgba(252,211,77,0.18)]'
              : 'border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.14)]',
        )}
      >
        <div className="absolute inset-[5px] border border-white/25" />
        <div className="absolute inset-x-[8px] top-[16%] border-t border-white/15" />
        <div className="absolute inset-x-[8px] bottom-[16%] border-t border-white/15" />
        {cardName ? (
          <>
            {cardNames.slice(-3).map((stackedCardName, index, visibleCards) => (
              <div
                key={`${stackedCardName}-${cardNames.length - visibleCards.length + index}`}
                className="absolute inset-0 overflow-hidden rounded-[3px] bg-black"
                style={{
                  transform: `translate(${(visibleCards.length - index - 1) * -4}px, ${(visibleCards.length - index - 1) * -4}px)`,
                  zIndex: index + 1,
                }}
              >
                <EndboardSlotCard name={stackedCardName} />
              </div>
            ))}
            {cardNames.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clearPickTimeout();
                  onBrowse();
                }}
                className="absolute bottom-1 left-1 z-40 rounded-full border border-white/25 bg-black/75 px-1.5 py-0.5 text-[10px] font-display font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label={`View all ${cardNames.length} cards in endboard slot`}
              >
                {cardNames.length} cards
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />
        )}
        <button
          type="button"
          onClick={handlePickClick}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handlePreview();
          }}
          className={cn(
            'absolute inset-0 z-30 flex items-center justify-center bg-black/10 text-white transition-all hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            cardName && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
          aria-label={cardName ? `Add another card to slot containing ${cardNames.length} card${cardNames.length === 1 ? '' : 's'}; double click ${cardName} for full art view` : 'Add card to endboard slot'}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/55 shadow-lg backdrop-blur">
            <Plus className="h-5 w-5" />
          </span>
        </button>
        {cardName && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="absolute right-1 top-1 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white opacity-0 shadow-lg backdrop-blur transition-all hover:bg-destructive/80 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Remove ${cardName} from endboard slot`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function EndboardBuilder({
  slots,
  knownCards,
  activeSlot,
  searchQuery,
  searchResults,
  isSearching,
  onOpenSearch,
  onCloseSearch,
  onSearchQueryChange,
  onSelectCard,
  onRemoveCard,
  onMoveCard,
  onSetSlotCards,
}: {
  slots: EndboardSlots;
  knownCards: string[];
  activeSlot: EndboardSlotId | null;
  searchQuery: string;
  searchResults: YgoSearchCard[];
  isSearching: boolean;
  onOpenSearch: (slotId: EndboardSlotId) => void;
  onCloseSearch: () => void;
  onSearchQueryChange: (query: string) => void;
  onSelectCard: (cardName: string) => void;
  onRemoveCard: (slotId: EndboardSlotId) => void;
  onMoveCard: (sourceSlotId: EndboardSlotId, targetSlotId: EndboardSlotId) => void;
  onSetSlotCards: (slotId: EndboardSlotId, cards: string[]) => void;
}) {
  const [previewCardName, setPreviewCardName] = useState<string | null>(null);
  const [activeStackSlot, setActiveStackSlot] = useState<EndboardSlotId | null>(null);
  const [stackEditIndex, setStackEditIndex] = useState<number | null | 'add'>(null);
  const [stackSearchQuery, setStackSearchQuery] = useState('');
  const [stackSearchResults, setStackSearchResults] = useState<YgoSearchCard[]>([]);
  const [isStackSearching, setIsStackSearching] = useState(false);
  const [showHand, setShowHand] = useState(() => ENDBOARD_HAND_SLOTS.some((slot) => Boolean(slots[slot.id]?.length)));
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const knownMatches = knownCards
    .filter((name) => !normalizedQuery || name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
  const combinedResults = [
    ...knownMatches.map((name) => ({ name, source: 'Known card' })),
    ...searchResults
      .filter((card) => !knownMatches.some((name) => name.toLowerCase() === card.name.toLowerCase()))
      .map((card) => ({ name: card.name, source: 'YGOPRO' })),
  ];
  const displayedResults = combinedResults.length > 0
    ? combinedResults
    : searchResults.map((card) => ({ name: card.name, source: 'YGOPRO' }));

  useEffect(() => {
    if (ENDBOARD_HAND_SLOTS.some((slot) => Boolean(slots[slot.id]?.length))) {
      setShowHand(true);
    }
  }, [slots]);

  useEffect(() => {
    if (stackEditIndex === null || stackSearchQuery.trim().length < 2) {
      setStackSearchResults([]);
      setIsStackSearching(false);
      return;
    }

    let cancelled = false;
    setIsStackSearching(true);
    const timeout = window.setTimeout(async () => {
      const results = await searchYgoCards(stackSearchQuery);
      if (cancelled) return;
      setStackSearchResults(results);
      setIsStackSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [stackEditIndex, stackSearchQuery]);

  const closeStackCardPicker = () => {
    setStackEditIndex(null);
    setStackSearchQuery('');
    setStackSearchResults([]);
    setIsStackSearching(false);
  };

  const selectStackCard = (cardName: string) => {
    if (!activeStackSlot || stackEditIndex === null) return;
    const nextCards = [...(slots[activeStackSlot] || [])];

    if (stackEditIndex === 'add') {
      nextCards.push(cardName);
    } else {
      nextCards[stackEditIndex] = cardName;
    }

    onSetSlotCards(activeStackSlot, nextCards);
    closeStackCardPicker();
  };

  const moveStackCard = (index: number, direction: -1 | 1) => {
    if (!activeStackSlot) return;
    const nextCards = [...(slots[activeStackSlot] || [])];
    const targetIndex = index + direction;
    if (!nextCards[index] || targetIndex < 0 || targetIndex >= nextCards.length) return;
    [nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]];
    onSetSlotCards(activeStackSlot, nextCards);
  };

  const removeStackCard = (index: number) => {
    if (!activeStackSlot) return;
    onSetSlotCards(activeStackSlot, (slots[activeStackSlot] || []).filter((_, cardIndex) => cardIndex !== index));
  };

  const renderSlot = (slot: EndboardSlotConfig) => (
    <EndboardSlot
      key={slot.id}
      slot={slot}
      cardNames={slots[slot.id] || []}
      onPick={() => onOpenSearch(slot.id)}
      onPreview={() => {
        const slotCards = slots[slot.id] || [];
        setPreviewCardName(slotCards[slotCards.length - 1] || null);
      }}
      onBrowse={() => setActiveStackSlot(slot.id)}
      onRemove={() => onRemoveCard(slot.id)}
      onDragStart={(event) => {
        if (!slots[slot.id]?.length) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(ENDBOARD_DRAG_DATA_TYPE, slot.id);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(ENDBOARD_DRAG_DATA_TYPE)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const sourceSlotId = event.dataTransfer.getData(ENDBOARD_DRAG_DATA_TYPE) as EndboardSlotId;
        if (!sourceSlotId) return;

        event.preventDefault();
        onMoveCard(sourceSlotId, slot.id);
      }}
    />
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="relative z-10 mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowHand((current) => !current)}
          aria-expanded={showHand}
          className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-display font-semibold text-amber-200 transition-colors hover:bg-amber-300/15 hover:text-amber-100"
        >
          {showHand ? 'Hide Hand' : 'Show Hand'}
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[15%] border-t border-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-[38%] border-t border-white/10" />
      <div className="pointer-events-none absolute inset-x-7 top-[37%] h-[17%] border-y border-white/10" />
      <div className="relative grid grid-cols-7 grid-rows-[0.58fr_1fr_1fr] gap-x-4 gap-y-6">
        {ENDBOARD_SLOTS.map(renderSlot)}
      </div>
      {showHand && (
        <div className="relative mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-amber-200">Cards in hand</h3>
            <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">
              Optional
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {ENDBOARD_HAND_SLOTS.map(renderSlot)}
          </div>
        </div>
      )}
      <EndboardCardPreview
        cardName={previewCardName}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewCardName(null);
        }}
      />
      <Dialog
        open={Boolean(activeStackSlot)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setActiveStackSlot(null);
            closeStackCardPicker();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle>Cards in this slot</DialogTitle>
            <button
              type="button"
              onClick={() => {
                setStackEditIndex('add');
                setStackSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-display font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Add card
            </button>
          </div>
          <DialogDescription>
            Preview, replace, remove, or reorder cards. Cards are shown from bottom to top.
          </DialogDescription>
          {stackEditIndex !== null && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-display font-semibold text-foreground">
                  {stackEditIndex === 'add' ? 'Add card to top' : `Replace card ${stackEditIndex + 1}`}
                </p>
                <button
                  type="button"
                  onClick={closeStackCardPicker}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
                  aria-label="Close stack card picker"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={stackSearchQuery}
                  onChange={(event) => setStackSearchQuery(event.target.value)}
                  autoFocus
                  placeholder="Search card name..."
                  className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {[...knownCards
                  .filter((name) => !stackSearchQuery.trim() || name.toLowerCase().includes(stackSearchQuery.trim().toLowerCase()))
                  .map((name) => ({ name, source: 'Known card' })),
                ...stackSearchResults
                  .filter((card) => !knownCards.some((name) => name.toLowerCase() === card.name.toLowerCase()))
                  .map((card) => ({ name: card.name, source: 'YGOPRO' }))]
                  .slice(0, 12)
                  .map((card) => (
                    <button
                      type="button"
                      key={card.name}
                      onClick={() => selectStackCard(card.name)}
                      className="rounded-full border border-border/60 bg-secondary/60 px-3 py-1.5 text-xs font-display font-semibold text-foreground hover:border-primary/50 hover:bg-primary/10"
                    >
                      {card.name}
                    </button>
                  ))}
                {isStackSearching && <span className="px-2 py-1.5 text-xs text-muted-foreground">Searching...</span>}
              </div>
            </div>
          )}
          <div className="grid max-h-[70dvh] grid-cols-2 gap-3 overflow-y-auto py-2 sm:grid-cols-3 md:grid-cols-4">
            {(activeStackSlot ? slots[activeStackSlot] || [] : []).map((stackedCardName, index, stack) => (
              <div
                key={`${stackedCardName}-${index}`}
                className="group rounded-xl border border-border/60 bg-secondary/40 p-2 text-left transition-all hover:border-primary/50 hover:bg-secondary/70"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveStackSlot(null);
                    setPreviewCardName(stackedCardName);
                  }}
                  className="block aspect-[0.686] w-full overflow-hidden rounded-lg bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`Preview ${stackedCardName} from endboard slot`}
                >
                  <EndboardSlotCard name={stackedCardName} />
                </button>
                <span className="mt-2 block line-clamp-2 text-xs font-display font-semibold text-foreground">
                  {stackedCardName}
                </span>
                <span className="mt-1 block text-[10px] font-display font-semibold uppercase tracking-wide text-muted-foreground">
                  {index === 0 ? 'Bottom card' : index === stack.length - 1 ? 'Top card' : `Card ${index + 1}`}
                </span>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStackCard(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Move ${stackedCardName} toward bottom`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStackCard(index, 1)}
                    disabled={index === stack.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Move ${stackedCardName} toward top`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStackEditIndex(index);
                      setStackSearchQuery('');
                    }}
                    className="ml-auto rounded-md border border-border/60 px-2 py-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground"
                    aria-label={`Replace ${stackedCardName}`}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStackCard(index)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${stackedCardName} from stack`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {activeSlot && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-background/95 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Add card</h3>
                <p className="text-xs text-muted-foreground">Search a card to add to this endboard slot.</p>
              </div>
              <button
                type="button"
                onClick={onCloseSearch}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                aria-label="Close endboard card search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                autoFocus
                placeholder="Search card name..."
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20 p-2">
              {isSearching ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : displayedResults.length > 0 ? (
                <div className="space-y-1">
                  {displayedResults.map((card) => (
                    <button
                      key={`${card.source}-${card.name}`}
                      type="button"
                      onClick={() => onSelectCard(card.name)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-primary/10"
                    >
                      <span>{card.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.source}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center text-center text-sm text-muted-foreground">
                  No cards found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border/70 bg-secondary/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutGuide() {
  return (
    <details className="w-full border-t border-border/50 pt-2">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground">
        <span>Shortcut Guide</span>
        <span className="shrink-0 text-right">Reference</span>
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg border border-border/50 bg-secondary/25 p-3">
            <h3 className="mb-2 text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={`${group.title}-${item.description}`} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.keys.map((key, index) => (
                      <span key={`${item.description}-${key}`} className="inline-flex items-center gap-1.5">
                        {index > 0 && <span className="text-muted-foreground/70">+</span>}
                        <ShortcutKey>{key}</ShortcutKey>
                      </span>
                    ))}
                  </div>
                  <span className="text-right text-muted-foreground">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function getComboLineRanges(text: string): ComboLineRange[] {
  let currentRawOffset = 0;
  let currentStepIndex = 0;

  return text.split('\n').reduce<ComboLineRange[]>((ranges, line, lineIndex) => {
    const rawStart = currentRawOffset;
    const rawEnd = rawStart + line.length;
    const renderedStart = rawOffsetToRenderedOffset(text, rawStart);
    const renderedEnd = rawOffsetToRenderedOffset(text, rawEnd);
    currentRawOffset = rawEnd + 1;

    if (!line.trim()) {
      return ranges;
    }

    ranges.push({
      rawStart,
      rawEnd,
      renderedStart,
      renderedEnd,
      lineIndex,
      stepIndex: currentStepIndex,
    });
    currentStepIndex += 1;
    return ranges;
  }, []);
}

function sanitizePastedHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }

    if (!(node instanceof HTMLElement)) return '';

    const tagName = node.tagName.toLowerCase();
    if (tagName === 'br') return '<br>';
    if (tagName === 'strong' || tagName === 'b') {
      return `<strong>${Array.from(node.childNodes).map(serializeNode).join('')}</strong>`;
    }
    if (tagName === 'div' || tagName === 'p') {
      return `${Array.from(node.childNodes).map(serializeNode).join('')}<br>`;
    }

    return Array.from(node.childNodes).map(serializeNode).join('');
  };

  return Array.from(doc.body.childNodes).map(serializeNode).join('').replace(/(<br>)+$/, '');
}

function matchesShortcut(event: KeyboardEvent, options: {
  code?: string;
  key?: string;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}) {
  if (options.altKey !== undefined && event.altKey !== options.altKey) return false;
  if (options.metaKey !== undefined && event.metaKey !== options.metaKey) return false;
  if (options.ctrlKey !== undefined && event.ctrlKey !== options.ctrlKey) return false;
  if (options.code && event.code === options.code) return true;
  if (options.key && event.key.toLowerCase() === options.key.toLowerCase()) return true;
  return false;
}

export default function Index() {
  const isMobile = useIsMobile();
  const [comboText, setComboText] = useState('');
  const [steps, setSteps] = useState<ComboAction[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<Partial<Record<number, number>>>({});
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [jumpStepInput, setJumpStepInput] = useState('');
  const [showQuickInserts, setShowQuickInserts] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const [stepComments, setStepComments] = useState<Record<number, StepComment>>({});
  const [comboLinks, setComboLinks] = useState<StepLinksByStep>({});
  const [openCommentStep, setOpenCommentStep] = useState<number | null>(null);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [linkTargetComboId, setLinkTargetComboId] = useState<string | null>(null);
  const [linkTargetStepIndex, setLinkTargetStepIndex] = useState(0);
  const [linkNameDraft, setLinkNameDraft] = useState('');
  const [activeSavedComboId, setActiveSavedComboId] = useState<string | null>(null);
  const [lastSavedCombo, setLastSavedCombo] = useState<SavedCombo | null>(null);
  const [activeAssignedDeck, setActiveAssignedDeck] = useState<DeckAssignment | undefined>(undefined);
  const [isBreakdownFullMode, setIsBreakdownFullMode] = useState(false);
  const [isEndboardMode, setIsEndboardMode] = useState(false);
  const [endboardSlots, setEndboardSlots] = useState<PersistedEndboardSlots>({});
  const [activeEndboardSlot, setActiveEndboardSlot] = useState<EndboardSlotId | null>(null);
  const [endboardSearchQuery, setEndboardSearchQuery] = useState('');
  const [endboardSearchResults, setEndboardSearchResults] = useState<YgoSearchCard[]>([]);
  const [isEndboardSearching, setIsEndboardSearching] = useState(false);
  const [activeCardSuggestions, setActiveCardSuggestions] = useState<CardSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [activeSuggestionRange, setActiveSuggestionRange] = useState<{ start: number; end: number } | null>(null);
  const [editorRawCaretOffset, setEditorRawCaretOffset] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previousHighlightedStepRef = useRef<number | null>(null);
  const pendingEditorHighlightRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const fullModeContainerRef = useRef<HTMLDivElement>(null);
  const comboTextRef = useRef(comboText);
  const endboardSlotsRef = useRef(endboardSlots);
  const stepCommentsRef = useRef(stepComments);
  const comboLinksRef = useRef(comboLinks);
  const stepsRef = useRef(steps);
  const activeSavedComboIdRef = useRef(activeSavedComboId);
  const wrapSelectionWithCardBracketsRef = useRef<() => void>(() => {});
  const branchGroups = useMemo(() => getComboBranchGroups(steps), [steps]);
  const visibleActionIndices = useMemo(
    () => getVisibleComboActionIndices(steps, selectedRoutes),
    [selectedRoutes, steps],
  );
  const activeVisibleStepPosition = Math.max(0, visibleActionIndices.indexOf(activeStepIndex));
  const finalStepNumber = steps.reduce(
    (highest, step, index) => Math.max(highest, step.stepPath?.baseStep ?? index + 1),
    0,
  );
  const endboardBranchGroup = branchGroups[branchGroups.length - 1];
  const selectedEndboardRoute = endboardBranchGroup
    ? selectedRoutes[endboardBranchGroup.baseStep]
    : undefined;
  const displayedEndboardSlots = getScopedEndboardSlots(
    endboardSlots,
    selectedEndboardRoute !== undefined ? endboardBranchGroup?.baseStep : undefined,
    selectedEndboardRoute,
  );
  const activeComboDeckName = activeAssignedDeck?.name || lastSavedCombo?.assignedDeck?.name || lastSavedCombo?.deck;
  const inlineAutocomplete = useMemo(() => {
    if (activeCardSuggestions.length > 0) return null;
    return getInlineComboAutocomplete(comboText, editorRawCaretOffset, activeComboDeckName);
  }, [activeCardSuggestions.length, activeComboDeckName, comboText, editorRawCaretOffset]);

  useEffect(() => {
    comboTextRef.current = comboText;
  }, [comboText]);

  useEffect(() => {
    endboardSlotsRef.current = endboardSlots;
  }, [endboardSlots]);

  useEffect(() => {
    stepCommentsRef.current = stepComments;
  }, [stepComments]);

  useEffect(() => {
    comboLinksRef.current = comboLinks;
  }, [comboLinks]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    activeSavedComboIdRef.current = activeSavedComboId;
  }, [activeSavedComboId]);

  useEffect(() => {
    if (steps.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveStepIndex((current) => {
          const position = visibleActionIndices.indexOf(current);
          return visibleActionIndices[Math.max(0, position - 1)] ?? current;
        });
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveStepIndex((current) => {
          const position = visibleActionIndices.indexOf(current);
          return visibleActionIndices[Math.min(visibleActionIndices.length - 1, position + 1)] ?? current;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length, visibleActionIndices]);

  useEffect(() => {
    const handleShortcutKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Control' &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const editor = editorRef.current;
        const target = event.target as HTMLElement | null;
        const isEditorTarget = target === editor || editor?.contains(target ?? null);

        if (!editor || !isEditorTarget) return;

        const selectionOffsets = getEditorSelectionOffsets(editor);
        if (!selectionOffsets) return;

        const comboLineRanges = getComboLineRanges(comboTextRef.current);
        const selectedLine = comboLineRanges.find(({ renderedStart, renderedEnd }) => (
          selectionOffsets.start <= renderedEnd && selectionOffsets.end >= renderedStart
        ));

        if (!selectedLine) return;

        event.preventDefault();
        event.stopPropagation();

        const parsed = parseCombo(comboTextRef.current);
        if (parsed.length === 0 || selectedLine.stepIndex >= parsed.length) return;

        setSteps(parsed);
        const selectedPath = parsed[selectedLine.stepIndex]?.stepPath;
        if (selectedPath?.route !== undefined) {
          setSelectedRoutes((current) => ({ ...current, [selectedPath.baseStep]: selectedPath.route }));
        }
        setActiveStepIndex(selectedLine.stepIndex);
        setJumpStepInput(String(selectedPath?.baseStep ?? selectedLine.stepIndex + 1));
        return;
      }

      if (
        matchesShortcut(event, { metaKey: true, code: 'KeyS' }) ||
        matchesShortcut(event, { metaKey: true, key: 's' })
      ) {
        event.preventDefault();
        event.stopPropagation();
        const currentComboId = activeSavedComboIdRef.current;
        const currentComboText = comboTextRef.current;
        if (!currentComboId || !currentComboText.trim()) return;
        const updatedCombo = updateCombo(currentComboId, {
          text: currentComboText,
          endboardSlots: endboardSlotsRef.current,
          stepComments: stepCommentsRef.current,
          comboLinks: comboLinksRef.current,
        });
        if (updatedCombo) {
          setActiveSavedComboId(updatedCombo.id);
          setLastSavedCombo(updatedCombo);
          setActiveAssignedDeck(updatedCombo.assignedDeck);
        }
        return;
      }

      if (
        matchesShortcut(event, { altKey: false, metaKey: false, ctrlKey: true, code: 'KeyV' }) ||
        matchesShortcut(event, { altKey: false, metaKey: false, ctrlKey: true, key: 'v' })
      ) {
        event.preventDefault();
        event.stopPropagation();
        const parsed = parseCombo(comboTextRef.current);
        setSteps(parsed);
        setSelectedRoutes({});
        setActiveStepIndex(0);
        setJumpStepInput('');
        setStepComments({});
        setComboLinks({});
        setOpenCommentStep(null);
        return;
      }

      if (
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, code: 'KeyZ' }) ||
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, key: 'z' }) ||
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, key: 'Ω' })
      ) {
        event.preventDefault();
        event.stopPropagation();
        const currentSteps = stepsRef.current;
        const parsed = currentSteps.length > 0 ? currentSteps : parseCombo(comboTextRef.current);
        if (parsed.length === 0) return;

        if (currentSteps.length === 0) {
          setSteps(parsed);
          setStepComments({});
          setComboLinks({});
          setOpenCommentStep(null);
        }

        const visibleIndices = getVisibleComboActionIndices(parsed, {});
        const lastStepIndex = visibleIndices[visibleIndices.length - 1];
        setActiveStepIndex(lastStepIndex);
        setJumpStepInput(String(parsed[lastStepIndex]?.stepPath?.baseStep ?? visibleIndices.length));
        return;
      }

      if (
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, code: 'Digit5' }) ||
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, key: '[' })
      ) {
        const editor = editorRef.current;
        const target = event.target as HTMLElement | null;
        const isEditorTarget = target === editor || editor?.contains(target ?? null);

        if (!editor || !isEditorTarget) return;

        const selectionOffsets = getEditorSelectionOffsets(editor);
        if (!selectionOffsets || selectionOffsets.start === selectionOffsets.end) return;

        event.preventDefault();
        event.stopPropagation();
        wrapSelectionWithCardBracketsRef.current();
      }
    };

    document.addEventListener('keydown', handleShortcutKeyDown, true);
    window.addEventListener('keydown', handleShortcutKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleShortcutKeyDown, true);
      window.removeEventListener('keydown', handleShortcutKeyDown, true);
    };
  }, []);

  const isEditorVisibleForHighlight = useCallback((editor: HTMLElement) => {
    const rect = editor.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    return rect.bottom > 96 && rect.top < viewportHeight - 96;
  }, []);

  const syncActiveEditorLine = useCallback(() => {
    if (steps.length === 0) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (isBreakdownFullMode) return;

    if (!isEditorVisibleForHighlight(editor)) {
      pendingEditorHighlightRef.current = true;
      return;
    }

    const activeStepChanged = previousHighlightedStepRef.current !== activeStepIndex;
    if (document.activeElement === editor && !activeStepChanged && !pendingEditorHighlightRef.current) return;

    const lineRanges = getComboLineRanges(comboText);
    const activeRange = lineRanges[activeStepIndex];
    if (!activeRange) return;

    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor || !isEditorVisibleForHighlight(currentEditor)) {
        pendingEditorHighlightRef.current = true;
        return;
      }

      currentEditor.focus({ preventScroll: true });
      setEditorSelectionByOffsets(currentEditor, activeRange.renderedStart, activeRange.renderedEnd);

      const lineHeight = 28;
      const activeLineIndex = comboText.slice(0, activeRange.rawStart).split('\n').length - 1;
      const targetScrollTop = Math.max(0, activeLineIndex * lineHeight - currentEditor.clientHeight / 2);
      currentEditor.scrollTop = targetScrollTop;
      previousHighlightedStepRef.current = activeStepIndex;
      pendingEditorHighlightRef.current = false;
    });
  }, [activeStepIndex, comboText, isBreakdownFullMode, isEditorVisibleForHighlight, steps.length]);

  useEffect(() => {
    syncActiveEditorLine();
  }, [syncActiveEditorLine]);

  useEffect(() => {
    const handleScroll = () => {
      if (!pendingEditorHighlightRef.current) return;
      syncActiveEditorLine();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [syncActiveEditorLine]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = comboTextToEditorHtml(comboText);
    if (editorHtmlToComboText(editor) === comboText && editor.innerHTML.trim().length > 0) return;
    editor.innerHTML = nextHtml;
  }, [comboText]);

  const closeCardSuggestions = () => {
    setActiveCardSuggestions([]);
    setActiveSuggestionIndex(0);
    setActiveSuggestionRange(null);
  };

  const refreshEditorCaretOffset = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) {
      setEditorRawCaretOffset(null);
      return;
    }

    const selectionOffsets = getEditorSelectionOffsets(editor);
    if (!selectionOffsets || selectionOffsets.start !== selectionOffsets.end) {
      setEditorRawCaretOffset(null);
      return;
    }

    setEditorRawCaretOffset(renderedOffsetToRawOffset(text, selectionOffsets.start));
  }, []);

  const refreshCardSuggestions = (text: string) => {
    const editor = editorRef.current;
    if (!editor) {
      closeCardSuggestions();
      return;
    }

    const selectionOffsets = getEditorSelectionOffsets(editor);
    if (!selectionOffsets || selectionOffsets.start !== selectionOffsets.end) {
      closeCardSuggestions();
      return;
    }

    const rawSelectionStart = renderedOffsetToRawOffset(text, selectionOffsets.start);
    const rawSelectionEnd = renderedOffsetToRawOffset(text, selectionOffsets.end);
    const suggestionRange = getCardSuggestionRange(text, rawSelectionStart, rawSelectionEnd);
    if (!suggestionRange) {
      closeCardSuggestions();
      return;
    }

    const normalizedQuery = suggestionRange.query.trim().toLowerCase();
    const suggestions = getCardSuggestions(text, activeAssignedDeck)
      .filter(({ name }) => !normalizedQuery || name.toLowerCase().startsWith(normalizedQuery))
      .slice(0, 6);

    if (suggestions.length === 0) {
      closeCardSuggestions();
      return;
    }

    setActiveCardSuggestions(suggestions);
    setActiveSuggestionIndex(0);
    setActiveSuggestionRange({ start: suggestionRange.start, end: suggestionRange.end });
  };

  const applyCardSuggestion = (suggestionName: string) => {
    const editor = editorRef.current;
    if (!editor || !activeSuggestionRange) return;

    const hasClosingBracket = comboText[activeSuggestionRange.end] === ']';
    const insertedText = hasClosingBracket ? suggestionName : `${suggestionName}]`;
    const nextText =
      comboText.slice(0, activeSuggestionRange.start) +
      insertedText +
      comboText.slice(activeSuggestionRange.end);
    const caretOffset = activeSuggestionRange.start + insertedText.length;

    setComboText(nextText);
    setEditorRawCaretOffset(caretOffset);
    closeCardSuggestions();
    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      currentEditor.focus();
      const renderedCaretOffset = rawOffsetToRenderedOffset(nextText, caretOffset);
      setEditorSelectionByOffsets(currentEditor, renderedCaretOffset, renderedCaretOffset);
    });
  };

  const acceptInlineAutocomplete = () => {
    const editor = editorRef.current;
    if (!editor || !inlineAutocomplete) return;

    const nextText =
      comboText.slice(0, inlineAutocomplete.caretRawOffset) +
      inlineAutocomplete.completion +
      comboText.slice(inlineAutocomplete.caretRawOffset);
    const caretOffset = inlineAutocomplete.caretRawOffset + inlineAutocomplete.completion.length;

    setComboText(nextText);
    setEditorRawCaretOffset(caretOffset);
    closeCardSuggestions();
    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      currentEditor.focus();
      const renderedCaretOffset = rawOffsetToRenderedOffset(nextText, caretOffset);
      setEditorSelectionByOffsets(currentEditor, renderedCaretOffset, renderedCaretOffset);
    });
  };

  const insertNextRouteLine = () => {
    const editor = editorRef.current;
    if (!editor) return false;

    const selectionOffsets = getEditorSelectionOffsets(editor);
    if (!selectionOffsets) return false;

    const rawSelectionStart = renderedOffsetToRawOffset(comboText, selectionOffsets.start);
    const rawSelectionEnd = renderedOffsetToRawOffset(comboText, selectionOffsets.end);
    const insertion = getNextRouteLineInsertion(comboText, rawSelectionStart, rawSelectionEnd);
    if (!insertion) return false;

    const nextText =
      comboText.slice(0, rawSelectionStart) +
      insertion +
      comboText.slice(rawSelectionEnd);
    const caretOffset = rawSelectionStart + insertion.length;

    setComboText(nextText);
    setEditorRawCaretOffset(caretOffset);
    closeCardSuggestions();
    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      currentEditor.focus();
      const renderedCaretOffset = rawOffsetToRenderedOffset(nextText, caretOffset);
      setEditorSelectionByOffsets(currentEditor, renderedCaretOffset, renderedCaretOffset);
    });

    return true;
  };

  useEffect(() => {
    if (!activeEndboardSlot || endboardSearchQuery.trim().length < 2) {
      setEndboardSearchResults([]);
      setIsEndboardSearching(false);
      return;
    }

    let isCancelled = false;
    setIsEndboardSearching(true);

    const timeout = window.setTimeout(() => {
      void searchYgoCards(endboardSearchQuery).then((cards) => {
        if (isCancelled) return;
        setEndboardSearchResults(cards);
        setIsEndboardSearching(false);
      });
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeEndboardSlot, endboardSearchQuery]);

  useEffect(() => {
    if (!isBreakdownFullMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isBreakdownFullMode]);

  useEffect(() => {
    if (!isBreakdownFullMode || !isMobile) return;

    const fullModeElement = fullModeContainerRef.current;
    const orientation = screen.orientation;

    const enterFullscreen = async () => {
      try {
        if (fullModeElement && document.fullscreenElement !== fullModeElement) {
          await fullModeElement.requestFullscreen();
        }
      } catch {
        // Ignore fullscreen failures on browsers that do not support it.
      }

      try {
        await orientation?.lock?.('landscape');
      } catch {
        // Ignore orientation lock failures on unsupported mobile browsers.
      }
    };

    void enterFullscreen();

    return () => {
      try {
        orientation?.unlock?.();
      } catch {
        // Ignore orientation unlock failures.
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {
          // Ignore fullscreen exit failures.
        });
      }
    };
  }, [isBreakdownFullMode, isMobile]);

  const handleVisualize = () => {
    const parsed = parseCombo(comboText);
    setSteps(parsed);
    setSelectedRoutes({});
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setComboLinks({});
    setOpenCommentStep(null);
  };

  const handleInsertPreset = (preset: string) => {
    const placeholderReadyPreset = preset.replace(/\[(Card(?: [A-Z])?)\]/g, '[]');

    setComboText((prev) => {
      const prefix = prev && !prev.endsWith('\n') ? '\n' : '';
      const nextValue = prev + prefix + placeholderReadyPreset;
      const selectionStart = prev.length + prefix.length + placeholderReadyPreset.indexOf('[') + 1;

      requestAnimationFrame(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        if (placeholderReadyPreset.includes('[]')) {
          const renderedSelectionStart = rawOffsetToRenderedOffset(nextValue, selectionStart);
          setEditorSelectionByOffsets(editor, renderedSelectionStart, renderedSelectionStart);
        } else {
          const renderedEnd = rawOffsetToRenderedOffset(nextValue, nextValue.length);
          setEditorSelectionByOffsets(editor, renderedEnd, renderedEnd);
        }
      });

      return nextValue;
    });
  };

  const handleWrapSelectionWithBold = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('bold');
    setComboText(editorHtmlToComboText(editor));
  };

  const handleWrapSelectionWithCardBrackets = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selectionOffsets = getEditorSelectionOffsets(editor);
    if (!selectionOffsets || selectionOffsets.start === selectionOffsets.end) return;

    const rawSelectionStart = renderedOffsetToRawOffset(comboTextRef.current, selectionOffsets.start);
    const rawSelectionEnd = renderedOffsetToRawOffset(comboTextRef.current, selectionOffsets.end);
    const nextText =
      `${comboTextRef.current.slice(0, rawSelectionStart)}[` +
      `${comboTextRef.current.slice(rawSelectionStart, rawSelectionEnd)}]` +
      comboTextRef.current.slice(rawSelectionEnd);

    setComboText(nextText);

    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;

      currentEditor.focus();
      const renderedSelectionStart = rawOffsetToRenderedOffset(nextText, rawSelectionStart + 1);
      const renderedSelectionEnd = rawOffsetToRenderedOffset(nextText, rawSelectionEnd + 1);
      setEditorSelectionByOffsets(currentEditor, renderedSelectionStart, renderedSelectionEnd);
      refreshCardSuggestions(nextText);
    });
  };

  wrapSelectionWithCardBracketsRef.current = handleWrapSelectionWithCardBrackets;

  const handleExample = () => {
    setComboText(EXAMPLE_COMBO);
    setSteps(parseCombo(EXAMPLE_COMBO));
    setSelectedRoutes({});
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setComboLinks({});
    setOpenCommentStep(null);
    setActiveSavedComboId(null);
    setLastSavedCombo(null);
    setActiveAssignedDeck(undefined);
    setEndboardSlots({});
    setComboLinks({});
    closeEndboardSearch();
  };

  const handleLoadCombo = (combo: SavedCombo) => {
    setComboText(combo.text);
    setSteps(parseCombo(combo.text));
    setSelectedRoutes({});
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setOpenCommentStep(null);
    setActiveSavedComboId(combo.id);
    setLastSavedCombo(combo);
    setActiveAssignedDeck(combo.assignedDeck);
    setEndboardSlots(normalizeEndboardSlots(combo.endboardSlots));
    setStepComments(normalizeStepComments(combo.stepComments));
    setComboLinks(normalizeComboLinks(combo.comboLinks));
    closeEndboardSearch();
  };

  const handleJumpToStep = () => {
    if (!visibleActionIndices.length) return;
    const requestedStep = Number.parseInt(jumpStepInput, 10);
    if (!Number.isFinite(requestedStep)) return;

    const explicitStepIndex = visibleActionIndices.find((index) => (
      steps[index]?.stepPath?.route === undefined && steps[index]?.stepPath?.baseStep === requestedStep
    ));
    const visiblePosition = Math.min(Math.max(requestedStep, 1), visibleActionIndices.length) - 1;
    const targetIndex = explicitStepIndex ?? visibleActionIndices[visiblePosition];
    setActiveStepIndex(targetIndex);
    setJumpStepInput(String(steps[targetIndex]?.stepPath?.baseStep ?? visiblePosition + 1));
  };

  const goToPreviousStep = () => {
    setActiveStepIndex((current) => {
      const position = visibleActionIndices.indexOf(current);
      return visibleActionIndices[Math.max(0, position - 1)] ?? current;
    });
  };

  const goToNextStep = () => {
    setActiveStepIndex((current) => {
      const position = visibleActionIndices.indexOf(current);
      return visibleActionIndices[Math.min(visibleActionIndices.length - 1, position + 1)] ?? current;
    });
  };

  const handleBreakdownTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleBreakdownTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || !isBreakdownFullMode) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 48) return;

    if (deltaX < 0) {
      goToNextStep();
      return;
    }

    goToPreviousStep();
  };

  const openBreakdownFullMode = () => {
    const editor = editorRef.current;
    if (editor && document.activeElement === editor) {
      editor.blur();
    }
    clearBrowserSelection();
    setIsBreakdownFullMode(true);
  };

  const closeBreakdownFullMode = () => {
    setIsBreakdownFullMode(false);
  };

  const openEndboardMode = () => {
    if (endboardBranchGroup && selectedEndboardRoute === undefined) {
      const firstRoute = endboardBranchGroup.routes[0]?.route;
      if (firstRoute !== undefined) {
        setSelectedRoutes((current) => ({ ...current, [endboardBranchGroup.baseStep]: firstRoute }));
      }
    }
    setIsEndboardMode(true);
  };

  const openEndboardSearch = (slotId: EndboardSlotId) => {
    setActiveEndboardSlot(slotId);
    setEndboardSearchQuery('');
    setEndboardSearchResults([]);
    setIsEndboardSearching(false);
  };

  const closeEndboardSearch = () => {
    setActiveEndboardSlot(null);
    setEndboardSearchQuery('');
    setEndboardSearchResults([]);
    setIsEndboardSearching(false);
  };

  const persistEndboardSlots = (nextSlots: PersistedEndboardSlots) => {
    const currentComboId = activeSavedComboIdRef.current;
    if (!currentComboId) return;

    const updatedCombo = updateCombo(currentComboId, { endboardSlots: nextSlots });
    if (!updatedCombo) return;

    setLastSavedCombo(updatedCombo);
    setActiveAssignedDeck(updatedCombo.assignedDeck);
  };

  const commitEndboardSlots = (createNextSlots: (current: EndboardSlots) => EndboardSlots) => {
    setEndboardSlots((current) => {
      const currentScopedSlots = getScopedEndboardSlots(
        current,
        selectedEndboardRoute !== undefined ? endboardBranchGroup?.baseStep : undefined,
        selectedEndboardRoute,
      );
      const nextScopedSlots = createNextSlots(currentScopedSlots);
      const nextSlots = replaceScopedEndboardSlots(
        current,
        nextScopedSlots,
        selectedEndboardRoute !== undefined ? endboardBranchGroup?.baseStep : undefined,
        selectedEndboardRoute,
      );
      persistEndboardSlots(nextSlots);
      return nextSlots;
    });
  };

  const handleSelectEndboardCard = (cardName: string) => {
    if (!activeEndboardSlot) return;
    commitEndboardSlots((current) => ({
      ...current,
      [activeEndboardSlot]: [...(current[activeEndboardSlot] || []), cardName],
    }));
    closeEndboardSearch();
  };

  const handleRemoveEndboardCard = (slotId: EndboardSlotId) => {
    commitEndboardSlots((current) => {
      const nextSlots = { ...current };
      const remainingCards = (nextSlots[slotId] || []).slice(0, -1);
      if (remainingCards.length > 0) {
        nextSlots[slotId] = remainingCards;
      } else {
        delete nextSlots[slotId];
      }
      return nextSlots;
    });
  };

  const handleMoveEndboardCard = (sourceSlotId: EndboardSlotId, targetSlotId: EndboardSlotId) => {
    if (sourceSlotId === targetSlotId) return;

    commitEndboardSlots((current) => {
      const sourceCards = current[sourceSlotId];
      if (!sourceCards?.length) return current;

      const targetCards = current[targetSlotId];
      const nextSlots = { ...current, [targetSlotId]: sourceCards };
      if (targetCards?.length) {
        nextSlots[sourceSlotId] = targetCards;
      } else {
        delete nextSlots[sourceSlotId];
      }

      return nextSlots;
    });
  };

  const handleSetEndboardSlotCards = (slotId: EndboardSlotId, cards: string[]) => {
    commitEndboardSlots((current) => {
      const nextSlots = { ...current };
      if (cards.length > 0) {
        nextSlots[slotId] = cards;
      } else {
        delete nextSlots[slotId];
      }
      return nextSlots;
    });
  };

  const handleAddComment = () => {
    commitStepComments((current) => ({
      ...current,
      [activeStepIndex]: current[activeStepIndex] ?? { text: '', x: 20, y: 18, width: 260 },
    }));
    setOpenCommentStep(activeStepIndex);
  };

  const persistStepComments = (nextComments: Record<number, StepComment>) => {
    const currentComboId = activeSavedComboIdRef.current;
    if (!currentComboId) return;

    const updatedCombo = updateCombo(currentComboId, { stepComments: nextComments });
    if (!updatedCombo) return;

    setLastSavedCombo(updatedCombo);
    setActiveAssignedDeck(updatedCombo.assignedDeck);
  };

  const commitStepComments = (createNextComments: (current: Record<number, StepComment>) => Record<number, StepComment>) => {
    setStepComments((current) => {
      const nextComments = createNextComments(current);
      persistStepComments(nextComments);
      return nextComments;
    });
  };

  const handleCommentChange = (stepIndex: number, text: string) => {
    commitStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { x: 20, y: 18, width: 260 }),
        text,
      },
    }));
  };

  const handleCommentPositionChange = (stepIndex: number, x: number, y: number) => {
    commitStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { text: '', width: 260 }),
        x,
        y,
      },
    }));
  };

  const handleCommentWidthChange = (stepIndex: number, width: number) => {
    commitStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { text: '', x: 20, y: 18 }),
        width,
      },
    }));
  };

  const handleCommentDelete = (stepIndex: number) => {
    commitStepComments((current) => {
      const nextComments = { ...current };
      delete nextComments[stepIndex];
      return nextComments;
    });
    setOpenCommentStep((current) => (current === stepIndex ? null : current));
  };

  const persistComboLinks = (nextLinks: StepLinksByStep) => {
    const currentComboId = activeSavedComboIdRef.current;
    if (!currentComboId) return;

    const updatedCombo = updateCombo(currentComboId, { comboLinks: nextLinks });
    if (!updatedCombo) return;

    setLastSavedCombo(updatedCombo);
    setActiveAssignedDeck(updatedCombo.assignedDeck);
  };

  const commitComboLinks = (createNextLinks: (current: StepLinksByStep) => StepLinksByStep) => {
    setComboLinks((current) => {
      const nextLinks = createNextLinks(current);
      persistComboLinks(nextLinks);
      return nextLinks;
    });
  };

  const savedCombosForLinks = getSavedCombos();
  const linkTargetCombo = linkTargetComboId
    ? savedCombosForLinks.find((combo) => combo.id === linkTargetComboId)
    : null;
  const linkTargetSteps = parseCombo(linkTargetCombo?.text ?? comboText);
  const clampedLinkTargetStepIndex = Math.min(linkTargetStepIndex, Math.max(0, linkTargetSteps.length - 1));

  const openLinkPicker = () => {
    if (!steps.length) return;
    setLinkTargetComboId(null);
    setLinkTargetStepIndex(activeStepIndex);
    setLinkNameDraft('');
    setIsLinkPickerOpen(true);
  };

  const handleCreateLink = () => {
    const targetSteps = parseCombo(linkTargetCombo?.text ?? comboText);
    if (targetSteps.length === 0) return;

    const targetStepIndex = Math.min(clampedLinkTargetStepIndex, targetSteps.length - 1);
    const targetComboName = linkTargetCombo?.name || 'This combo';
    const nextLink: StepLink = {
      id: crypto.randomUUID(),
      label: linkNameDraft.trim() || `${targetComboName} - Step ${targetStepIndex + 1}`,
      targetComboId: linkTargetComboId,
      targetStepIndex,
      x: 76,
      y: 18 + ((comboLinks[activeStepIndex]?.length ?? 0) * 48),
      width: 240,
    };

    commitComboLinks((current) => ({
      ...current,
      [activeStepIndex]: [...(current[activeStepIndex] ?? []), nextLink],
    }));
    setIsLinkPickerOpen(false);
  };

  const handleLinkLabelChange = (linkId: string, label: string) => {
    commitComboLinks((current) => ({
      ...current,
      [activeStepIndex]: (current[activeStepIndex] ?? []).map((link) =>
        link.id === linkId ? { ...link, label } : link,
      ),
    }));
  };

  const handleLinkDelete = (linkId: string) => {
    commitComboLinks((current) => {
      const nextStepLinks = (current[activeStepIndex] ?? []).filter((link) => link.id !== linkId);
      const nextLinks = { ...current };
      if (nextStepLinks.length > 0) {
        nextLinks[activeStepIndex] = nextStepLinks;
      } else {
        delete nextLinks[activeStepIndex];
      }
      return nextLinks;
    });
  };

  const handleLinkPositionChange = (linkId: string, x: number, y: number) => {
    commitComboLinks((current) => ({
      ...current,
      [activeStepIndex]: (current[activeStepIndex] ?? []).map((link) =>
        link.id === linkId ? { ...link, x, y } : link,
      ),
    }));
  };

  const handleLinkWidthChange = (linkId: string, width: number) => {
    commitComboLinks((current) => ({
      ...current,
      [activeStepIndex]: (current[activeStepIndex] ?? []).map((link) =>
        link.id === linkId ? { ...link, width } : link,
      ),
    }));
  };

  const handleOpenLink = (link: StepLink) => {
    if (!link.targetComboId) {
      const currentSteps = stepsRef.current.length > 0 ? stepsRef.current : parseCombo(comboTextRef.current);
      if (currentSteps.length === 0) return;
      const targetStepIndex = Math.min(link.targetStepIndex, currentSteps.length - 1);
      setSteps(currentSteps);
      setActiveStepIndex(targetStepIndex);
      setJumpStepInput(String(targetStepIndex + 1));
      setIsEndboardMode(false);
      return;
    }

    const targetCombo = getSavedCombos().find((combo) => combo.id === link.targetComboId);
    if (!targetCombo) return;
    const targetSteps = parseCombo(targetCombo.text);
    if (targetSteps.length === 0) return;

    handleLoadCombo(targetCombo);
    const targetStepIndex = Math.min(link.targetStepIndex, targetSteps.length - 1);
    setActiveStepIndex(targetStepIndex);
    setJumpStepInput(String(targetStepIndex + 1));
    setIsEndboardMode(false);
  };

  const activeStep = steps[activeStepIndex];
  const activeBranchGroup = branchGroups.find((group) => (
    group.branchActionIndex === activeStepIndex ||
    group.routes.some((route) => route.actionIndices.includes(activeStepIndex))
  ));
  const editorLineNumbers = Array.from({ length: Math.max(comboText.split('\n').length, 1) }, (_, index) => index + 1);
  const knownEndboardCards = Array.from(new Set([
    ...getCardSuggestions(comboText, activeAssignedDeck).map((suggestion) => suggestion.name),
    ...Object.values(endboardSlots).flatMap((slotCards) => normalizeEndboardSlotCards(slotCards)),
  ])).sort((a, b) => a.localeCompare(b));

  const handleSelectRoute = (group: ComboBranchGroup, route: number) => {
    setSelectedRoutes((current) => ({ ...current, [group.baseStep]: route }));
    const firstRouteActionIndex = group.routes.find((candidate) => candidate.route === route)?.actionIndices[0];
    if (firstRouteActionIndex !== undefined) {
      setActiveStepIndex(firstRouteActionIndex);
      setJumpStepInput(String(group.baseStep));
    }
  };

  const renderRoutesWindow = (
    group: ComboBranchGroup,
    onSelectRoute: (route: number) => void,
    className: string,
    showMerge = false,
  ) => (
    <div
      className={`z-20 flex flex-col items-center gap-2 rounded-2xl border border-fuchsia-300/25 bg-background/85 p-2 shadow-xl backdrop-blur ${className}`}
      aria-label={`Routes from step ${group.baseStep}`}
    >
      <span className="px-1 text-[9px] font-display font-bold uppercase tracking-[0.18em] text-fuchsia-200/75">
        Routes
      </span>
      {group.routes.map(({ route, actionIndices }) => (
        <button
          key={`${group.baseStep}-${route}`}
          type="button"
          onClick={() => onSelectRoute(route)}
          aria-label={`Show route ${route} from step ${group.baseStep}`}
          title={`${actionIndices.length} unique step${actionIndices.length === 1 ? '' : 's'}`}
          className={`flex h-9 w-9 items-center justify-center rounded-full border font-display text-sm font-bold transition-all ${
            selectedRoutes[group.baseStep] === route
              ? 'border-fuchsia-200/70 bg-fuchsia-300/25 text-fuchsia-50 shadow-[0_0_18px_rgba(232,121,249,0.24)]'
              : 'border-border/70 bg-secondary/70 text-muted-foreground hover:border-fuchsia-300/45 hover:text-fuchsia-100'
          }`}
        >
          {route}
        </button>
      ))}
      {showMerge && group.mergeActionIndex !== undefined && (
        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-display font-semibold uppercase tracking-wide text-emerald-200/80">
          Merge
        </span>
      )}
    </div>
  );

  const renderBreakdownVisual = (mode: 'inline' | 'full') => {
    if (!activeStep) return null;
    const isDesktopFullMode = mode === 'full' && !isMobile;

    return (
      <div className="relative flex w-full items-center justify-center">
        {activeBranchGroup && renderRoutesWindow(
          activeBranchGroup,
          (route) => handleSelectRoute(activeBranchGroup, route),
          'absolute left-2 top-1/2 -translate-y-1/2 md:left-0 md:-translate-x-[calc(100%+0.75rem)]',
          true,
        )}
        <ComboStepVisual
          key={`${activeStepIndex}-${mode}`}
          className={
            mode === 'full'
              ? 'h-[78dvh] w-[92vw] max-w-[1400px] overflow-hidden'
              : 'h-[500px] w-full overflow-hidden'
          }
          action={activeStep}
          stepNumber={activeVisibleStepPosition + 1}
          stepLabel={activeStep.stepPath?.label}
          cardSize={isDesktopFullMode ? 'desktop-full' : 'default'}
          comment={stepComments[activeStepIndex]}
          isCommentEditorOpen={openCommentStep === activeStepIndex}
          onOpenCommentEditor={() => setOpenCommentStep(activeStepIndex)}
          onCloseCommentEditor={() => setOpenCommentStep((current) => (current === activeStepIndex ? null : current))}
          onCommentChange={(text) => handleCommentChange(activeStepIndex, text)}
          onCommentDelete={() => handleCommentDelete(activeStepIndex)}
          onCommentPositionChange={(x, y) => handleCommentPositionChange(activeStepIndex, x, y)}
          onCommentWidthChange={(width) => handleCommentWidthChange(activeStepIndex, width)}
          links={comboLinks[activeStepIndex] ?? []}
          onLinkLabelChange={handleLinkLabelChange}
          onLinkDelete={handleLinkDelete}
          onLinkPositionChange={handleLinkPositionChange}
          onLinkWidthChange={handleLinkWidthChange}
          onOpenLink={handleOpenLink}
        />
      </div>
    );
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="shapegrid-canvas">
          <SideRays
            speed={2.5}
            rayColor1="#EAB308"
            rayColor2="#96c8ff"
            intensity={2}
            spread={2}
            origin="top-right"
            tilt={0}
            saturation={1.5}
            blend={0.75}
            falloff={1.6}
            opacity={1}
          />
        </div>
      </div>
      <div className="relative z-10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <AnimatedGradientText
            speed={3}
            colorFrom="#bd105e"
            colorTo="#cf0bb1da"
            className="font-display text-4xl font-semibold tracking-tight md:text-5xl"
          >
            Combo Visualizer
          </AnimatedGradientText>
          <p className="text-muted-foreground font-body text-sm">
            Write your combo steps using <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">[Card Name]</code> brackets — get instant visuals
          </p>
        </header>

        {/* Input */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="relative">
            {comboText.length === 0 && (
              <div className="pointer-events-none absolute left-14 top-4 z-10 text-sm leading-7 text-muted-foreground/50">
                e.g. Special Summon [Diabellze the White Witch] from hand and send **Susurrus of the Sinful Spoils** to the Graveyard
              </div>
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-11 overflow-hidden rounded-l-lg border-r border-border/50 bg-background/20 px-2 py-4 text-right font-mono text-xs leading-7 text-muted-foreground/55 select-none"
              style={{ userSelect: 'none' }}
            >
              <div style={{ transform: `translateY(-${editorScrollTop}px)` }}>
                {editorLineNumbers.map((lineNumber) => (
                  <div key={lineNumber} className="h-7 tabular-nums">
                    {lineNumber}
                  </div>
                ))}
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const nextText = editorHtmlToComboText(e.currentTarget);
                setComboText(nextText);
                refreshCardSuggestions(nextText);
                refreshEditorCaretOffset(nextText);
              }}
              onScroll={(e) => setEditorScrollTop(e.currentTarget.scrollTop)}
              onKeyDown={(e) => {
                if (activeCardSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSuggestionIndex((current) => (current + 1) % activeCardSuggestions.length);
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSuggestionIndex((current) => (current - 1 + activeCardSuggestions.length) % activeCardSuggestions.length);
                    return;
                  }

                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const selectedSuggestion = activeCardSuggestions[activeSuggestionIndex];
                    if (selectedSuggestion) {
                      applyCardSuggestion(selectedSuggestion.name);
                    }
                    return;
                  }

                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeCardSuggestions();
                    return;
                  }
                }

                if (
                  inlineAutocomplete &&
                  activeCardSuggestions.length === 0 &&
                  e.key === 'ArrowRight' &&
                  !e.altKey &&
                  !e.ctrlKey &&
                  !e.metaKey &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  acceptInlineAutocomplete();
                  return;
                }

                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                  e.preventDefault();
                  document.execCommand('bold');
                  const editor = editorRef.current;
                  if (editor) {
                    const nextText = editorHtmlToComboText(editor);
                    setComboText(nextText);
                    refreshEditorCaretOffset(nextText);
                  }
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (insertNextRouteLine()) return;
                  document.execCommand('insertLineBreak');
                }
              }}
              onKeyUp={(e) => {
                if (
                  activeCardSuggestions.length > 0 &&
                  ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)
                ) {
                  return;
                }

                const nextText = editorHtmlToComboText(e.currentTarget);
                refreshCardSuggestions(nextText);
                refreshEditorCaretOffset(nextText);
              }}
              onClick={(e) => {
                const nextText = editorHtmlToComboText(e.currentTarget);
                refreshCardSuggestions(nextText);
                refreshEditorCaretOffset(nextText);
              }}
              onBlur={() => {
                setEditorRawCaretOffset(null);
                requestAnimationFrame(() => {
                  const activeElement = document.activeElement as HTMLElement | null;
                  if (activeElement?.dataset.comboSuggestion === 'true') return;
                  closeCardSuggestions();
                });
              }}
              onPaste={(e) => {
                e.preventDefault();
                const html = e.clipboardData.getData('text/html');
                const text = e.clipboardData.getData('text/plain');
                if (html) {
                  document.execCommand('insertHTML', false, sanitizePastedHtml(html));
                } else if (text) {
                  document.execCommand('insertText', false, text);
                }

                const editor = editorRef.current;
                if (editor) {
                  const nextText = editorHtmlToComboText(editor);
                  setComboText(nextText);
                  refreshCardSuggestions(nextText);
                  refreshEditorCaretOffset(nextText);
                }
              }}
              className="h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/50 py-4 pl-14 pr-4 text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
            {inlineAutocomplete && editorRawCaretOffset !== null && (
              <div
                aria-hidden="true"
                data-testid="inline-combo-autocomplete"
                className="pointer-events-none absolute inset-0 z-10 h-36 overflow-hidden whitespace-pre-wrap rounded-lg py-4 pl-14 pr-4 text-sm leading-7 text-transparent"
              >
                <div style={{ transform: `translateY(-${editorScrollTop}px)` }}>
                  <span>{comboText.slice(0, inlineAutocomplete.caretRawOffset)}</span>
                  <span className="text-muted-foreground/35">
                    {inlineAutocomplete.completion}
                  </span>
                </div>
              </div>
            )}
            {activeCardSuggestions.length > 0 && (
              <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-lime-300/30 bg-background/95 p-2 shadow-2xl backdrop-blur">
                <div className="mb-1 px-2 text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-lime-300/80">
                  Card Suggestions
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCardSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.name}-${suggestion.count}-${index}`}
                      type="button"
                      data-combo-suggestion="true"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyCardSuggestion(suggestion.name)}
                      className={`rounded-full border px-3 py-1 text-xs font-body transition-all ${
                        index === activeSuggestionIndex
                          ? 'border-lime-300/50 bg-lime-300/15 text-lime-100'
                          : 'border-border/60 bg-secondary/60 text-muted-foreground hover:border-lime-300/40 hover:text-foreground'
                      }`}
                    >
                      [{suggestion.name}]
                      {suggestion.source === 'assigned-deck' && suggestion.deckSection && (
                        <span className="ml-1 text-[10px] uppercase opacity-70">
                          {suggestion.deckSection} x{suggestion.deckCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleVisualize}
              className="min-w-[148px] px-4 py-2 bg-primary text-primary-foreground font-display font-semibold rounded-lg glow-primary hover:brightness-110 transition-all text-sm"
            >
              Visualize Combo
            </button>
            <button
              onClick={handleExample}
              className="min-w-[148px] px-4 py-2 bg-secondary text-secondary-foreground font-display font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all text-sm"
            >
              Load Example
            </button>
            <button
              type="button"
              onClick={handleWrapSelectionWithBold}
              className="min-w-[148px] px-4 py-2 bg-secondary text-secondary-foreground font-display font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all text-sm"
            >
              Bold Card
            </button>
          {/* Presets */}
          <div className="w-full pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setShowQuickInserts((current) => !current)}
              className="mb-2 flex w-full items-center justify-between gap-3 text-left text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Quick Insert</span>
              <span className="shrink-0 text-right">{showQuickInserts ? 'Hide' : 'Show'}</span>
            </button>
            {showQuickInserts && (
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleInsertPreset(preset)}
                    className="px-2.5 py-1 bg-secondary/60 text-muted-foreground text-xs font-body rounded-md border border-border/50 hover:bg-primary/20 hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3">
              <ShortcutGuide />
            </div>
          </div>
        </div>
        </div>

        {/* Symbol help */}
        <details className="glass-panel rounded-xl p-4">
          <summary className="font-display font-semibold text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Symbols Guide
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-body text-muted-foreground">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${CHAIN_LINK_BG_CLASS} ${CHAIN_LINK_BORDER_CLASS}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 border border-border">
                <ChainLinkIcon className={CHAIN_LINK_TEXT_CLASS} />
              </div>
              <span className="text-foreground">Chain Link</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${PHASE_BG_CLASS} ${PHASE_BORDER_CLASS}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 border border-border">
                <PhaseIcon className={PHASE_TEXT_CLASS} />
              </div>
              <span className="text-foreground">{PHASE_GUIDE.name}</span>
            </div>
            {SYMBOL_GUIDE.map(({ type, name }) => {
              const style = EFFECT_STYLES[type];
              return (
                <div
                  key={`${type}-${name}`}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${style.bg} ${style.border}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 border border-border">
                    <EffectGlyph type={type} className={`h-4 w-4 ${style.text}`} />
                  </div>
                  <span className="text-foreground">{name}</span>
                </div>
              );
            })}
          </div>
        </details>

        {/* Combo Library */}
        <div className="glass-panel rounded-xl p-3">
          <button
            type="button"
            onClick={() => setShowLibrary((current) => !current)}
            aria-expanded={showLibrary}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-display font-bold text-lg text-foreground">Combo Library</span>
            <span className="text-xs font-display font-semibold text-muted-foreground">
              {showLibrary ? 'Hide' : 'Show'}
            </span>
          </button>
          {showLibrary && (
            <div className="mt-3">
              <ComboLibrary
                currentText={comboText}
                currentEndboardSlots={endboardSlots}
                currentStepComments={stepComments}
                currentComboLinks={comboLinks}
                activeComboId={activeSavedComboId}
                externalSavedCombo={lastSavedCombo}
                onLoad={handleLoadCombo}
                onSave={(combo) => {
                  setActiveSavedComboId(combo.id);
                  setLastSavedCombo(combo);
                  setActiveAssignedDeck(combo.assignedDeck);
                  setEndboardSlots(normalizeEndboardSlots(combo.endboardSlots));
                  setStepComments(normalizeStepComments(combo.stepComments));
                  setComboLinks(normalizeComboLinks(combo.comboLinks));
                }}
              />
            </div>
          )}
        </div>

        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-bold text-xl text-foreground">
                Combo Breakdown
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openEndboardMode}
                  aria-label="Show endboard builder"
                  className={`rounded-full border px-3 py-1 text-xs font-display font-semibold transition-all ${
                    isEndboardMode
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  Endboard
                </button>
                <button
                  type="button"
                  onClick={() => setIsEndboardMode(false)}
                  aria-label={`Show combo step ${activeStep.stepPath?.label ?? activeVisibleStepPosition + 1} of ${finalStepNumber}`}
                  className={`rounded-full border px-3 py-1 text-xs font-display font-semibold transition-all ${
                    !isEndboardMode
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  Step {activeStep.stepPath?.label ?? activeVisibleStepPosition + 1} / {finalStepNumber}
                </button>
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-2 py-1">
                  <input
                    value={jumpStepInput}
                    onChange={(e) => setJumpStepInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToStep()}
                    placeholder="Go to"
                    inputMode="numeric"
                    className="w-14 bg-transparent text-center text-xs font-display font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                    aria-label="Jump to step"
                  />
                  <button
                    type="button"
                    onClick={handleJumpToStep}
                    disabled={!jumpStepInput.trim()}
                    className="rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/90 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Jump
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={isEndboardMode}
                  className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
                >
                  {stepComments[activeStepIndex] ? 'Edit Comment' : 'Add Comment'}
                </button>
                <button
                  type="button"
                  onClick={openLinkPicker}
                  disabled={isEndboardMode}
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-display font-semibold text-cyan-200 transition-all hover:bg-cyan-300/15 hover:text-cyan-100"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Link
                  </span>
                </button>
                <button
                  type="button"
                  onClick={openBreakdownFullMode}
                  disabled={isEndboardMode}
                  className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Expand className="h-3.5 w-3.5" />
                    Full Mode
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={isEndboardMode || activeVisibleStepPosition === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isEndboardMode || activeVisibleStepPosition === visibleActionIndices.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {isEndboardMode ? (
                <div className="relative">
                  {endboardBranchGroup && renderRoutesWindow(
                    endboardBranchGroup,
                    (route) => {
                      closeEndboardSearch();
                      setSelectedRoutes((current) => ({ ...current, [endboardBranchGroup.baseStep]: route }));
                    },
                    'absolute left-2 top-1/2 -translate-y-1/2 md:left-0 md:-translate-x-[calc(100%+0.75rem)]',
                  )}
                  <EndboardBuilder
                    slots={displayedEndboardSlots}
                    knownCards={knownEndboardCards}
                    activeSlot={activeEndboardSlot}
                    searchQuery={endboardSearchQuery}
                    searchResults={endboardSearchResults}
                    isSearching={isEndboardSearching}
                    onOpenSearch={openEndboardSearch}
                    onCloseSearch={closeEndboardSearch}
                    onSearchQueryChange={setEndboardSearchQuery}
                    onSelectCard={handleSelectEndboardCard}
                    onRemoveCard={handleRemoveEndboardCard}
                    onMoveCard={handleMoveEndboardCard}
                    onSetSlotCards={handleSetEndboardSlotCards}
                  />
                </div>
              ) : (
                <>
                  {renderBreakdownVisual('inline')}
                  <div className="flex flex-wrap justify-center gap-2">
                    {visibleActionIndices.map((index, visiblePosition) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveStepIndex(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          index === activeStepIndex
                            ? 'w-8 bg-primary'
                            : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                        aria-label={`Go to step ${steps[index]?.stepPath?.label ?? visiblePosition + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Dialog open={isLinkPickerOpen} onOpenChange={setIsLinkPickerOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Create Combo Link</DialogTitle>
          <DialogDescription>
            Choose a combo and the exact step where this link should start.
          </DialogDescription>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Target combo
              </span>
              <select
                value={linkTargetComboId ?? ''}
                onChange={(event) => {
                  setLinkTargetComboId(event.target.value || null);
                  setLinkTargetStepIndex(0);
                }}
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">This combo</option>
                {savedCombosForLinks
                  .filter((combo) => combo.id !== activeSavedComboId)
                  .map((combo) => (
                    <option key={combo.id} value={combo.id}>
                      {combo.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Target step
              </span>
              <select
                value={String(clampedLinkTargetStepIndex)}
                onChange={(event) => setLinkTargetStepIndex(Number(event.target.value))}
                disabled={linkTargetSteps.length === 0}
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                {linkTargetSteps.map((step, index) => (
                  <option key={`${index}-${step.raw}`} value={index}>
                    Step {index + 1}: {step.raw}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Link name
              </span>
              <input
                value={linkNameDraft}
                onChange={(event) => setLinkNameDraft(event.target.value)}
                placeholder="Optional label"
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLinkPickerOpen(false)}
                className="rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-xs font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateLink}
                disabled={linkTargetSteps.length === 0}
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-display font-semibold text-cyan-200 transition-all hover:bg-cyan-300/15 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Link
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {isBreakdownFullMode && activeStep && (
        <div ref={fullModeContainerRef} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex h-full w-full items-center justify-center p-3">
            <div
              className="relative flex max-h-[94dvh] max-w-[96vw] items-center justify-center"
              onTouchStart={handleBreakdownTouchStart}
              onTouchEnd={handleBreakdownTouchEnd}
            >
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={activeVisibleStepPosition === 0}
                className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-lg backdrop-blur transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={activeVisibleStepPosition === visibleActionIndices.length - 1}
                className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-lg backdrop-blur transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next step"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={closeBreakdownFullMode}
                className="absolute right-3 top-3 z-20 flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-white/10 bg-black/70 px-3 text-white shadow-lg backdrop-blur transition-all hover:bg-black/90"
                aria-label="Close full mode"
              >
                <Minimize2 className="h-4 w-4" />
                <X className="h-4 w-4" />
              </button>
              <div className="absolute left-3 top-3 z-20 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-display font-semibold text-white shadow-lg backdrop-blur">
                Step {activeStep.stepPath?.label ?? activeVisibleStepPosition + 1} / {finalStepNumber}
              </div>
              <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-white/80 shadow-lg backdrop-blur">
                Use Left/Right arrows
              </div>
              <div
                className="flex max-h-[94dvh] w-fit max-w-[96vw] items-center justify-center px-12 py-10"
              >
                {renderBreakdownVisual('full')}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
