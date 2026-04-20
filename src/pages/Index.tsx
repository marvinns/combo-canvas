import { useEffect, useRef, useState } from 'react';
import { parseCombo, type ComboAction } from '@/lib/comboParser';
import { ComboStepVisual } from '@/components/ComboStepVisual';
import { ComboLibrary } from '@/components/ComboLibrary';
import { CHAIN_LINK_BG_CLASS, CHAIN_LINK_BORDER_CLASS, CHAIN_LINK_TEXT_CLASS, ChainLinkIcon, EFFECT_STYLES, EffectGlyph, PHASE_BG_CLASS, PHASE_BORDER_CLASS, PHASE_TEXT_CLASS, PhaseIcon } from '@/components/ActionIcon';
import { updateCombo } from '@/lib/comboLibrary';
import type { SavedCombo } from '@/lib/comboLibrary';
import { ChevronLeft, ChevronRight, Expand, Minimize2, X } from 'lucide-react';
import { AnimatedGradientText } from '@/components/AnimatedGradientText';
import { useIsMobile } from '@/hooks/use-mobile';

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

type StepComment = {
  text: string;
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
};

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

function getCardSuggestions(text: string): CardSuggestion[] {
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

  return Array.from(counts.entries())
    .map(([name, meta]) => ({ name, ...meta }))
    .sort((a, b) => b.count - a.count || b.lastIndex - a.lastIndex || a.name.localeCompare(b.name));
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
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [jumpStepInput, setJumpStepInput] = useState('');
  const [showQuickInserts, setShowQuickInserts] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [stepComments, setStepComments] = useState<Record<number, StepComment>>({});
  const [openCommentStep, setOpenCommentStep] = useState<number | null>(null);
  const [activeSavedComboId, setActiveSavedComboId] = useState<string | null>(null);
  const [lastSavedCombo, setLastSavedCombo] = useState<SavedCombo | null>(null);
  const [isBreakdownFullMode, setIsBreakdownFullMode] = useState(false);
  const [activeCardSuggestions, setActiveCardSuggestions] = useState<CardSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [activeSuggestionRange, setActiveSuggestionRange] = useState<{ start: number; end: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previousHighlightedStepRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const fullModeContainerRef = useRef<HTMLDivElement>(null);
  const comboTextRef = useRef(comboText);
  const stepsRef = useRef(steps);
  const activeSavedComboIdRef = useRef(activeSavedComboId);

  useEffect(() => {
    comboTextRef.current = comboText;
  }, [comboText]);

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
        setActiveStepIndex((current) => Math.max(0, current - 1));
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length]);

  useEffect(() => {
    const handleShortcutKeyDown = (event: KeyboardEvent) => {
      if (
        matchesShortcut(event, { metaKey: true, code: 'KeyS' }) ||
        matchesShortcut(event, { metaKey: true, key: 's' })
      ) {
        event.preventDefault();
        event.stopPropagation();
        const currentComboId = activeSavedComboIdRef.current;
        const currentComboText = comboTextRef.current;
        if (!currentComboId || !currentComboText.trim()) return;
        const updatedCombo = updateCombo(currentComboId, { text: currentComboText });
        if (updatedCombo) {
          setActiveSavedComboId(updatedCombo.id);
          setLastSavedCombo(updatedCombo);
        }
        return;
      }

      if (
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, code: 'KeyV' }) ||
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, key: 'v' }) ||
        matchesShortcut(event, { altKey: true, metaKey: false, ctrlKey: false, key: '√' })
      ) {
        event.preventDefault();
        event.stopPropagation();
        const parsed = parseCombo(comboTextRef.current);
        setSteps(parsed);
        setActiveStepIndex(0);
        setJumpStepInput('');
        setStepComments({});
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
          setOpenCommentStep(null);
        }

        const lastStepIndex = parsed.length - 1;
        setActiveStepIndex(lastStepIndex);
        setJumpStepInput(String(lastStepIndex + 1));
      }
    };

    document.addEventListener('keydown', handleShortcutKeyDown, true);
    window.addEventListener('keydown', handleShortcutKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleShortcutKeyDown, true);
      window.removeEventListener('keydown', handleShortcutKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (steps.length === 0) return;
    const editor = editorRef.current;
    if (!editor) return;
    const activeStepChanged = previousHighlightedStepRef.current !== activeStepIndex;
    if (document.activeElement === editor && !activeStepChanged) return;

    const lineRanges = comboText
      .split('\n')
      .reduce<Array<{ start: number; end: number }>>((ranges, line, index, allLines) => {
        const start = allLines.slice(0, index).reduce((total, currentLine) => total + currentLine.length + 1, 0);
        const end = start + line.length;
        if (line.trim().length > 0) {
          ranges.push({ start, end });
        }
        return ranges;
      }, []);

    const activeRange = lineRanges[activeStepIndex];
    if (!activeRange) return;

    requestAnimationFrame(() => {
      editor.focus({ preventScroll: true });
      setEditorSelectionByOffsets(editor, activeRange.start, activeRange.end);

      const lineHeight = 28;
      const activeLineIndex = comboText.slice(0, activeRange.start).split('\n').length - 1;
      const targetScrollTop = Math.max(0, activeLineIndex * lineHeight - editor.clientHeight / 2);
      editor.scrollTop = targetScrollTop;
      previousHighlightedStepRef.current = activeStepIndex;
    });
  }, [activeStepIndex, comboText, steps.length]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = comboTextToEditorHtml(comboText);
    if (editorHtmlToComboText(editor) === comboText && editor.innerHTML.trim().length > 0) return;
    editor.innerHTML = nextHtml;
  }, [comboText]);

  useEffect(() => {
    if (!isMobile && isBreakdownFullMode) {
      setIsBreakdownFullMode(false);
    }
  }, [isBreakdownFullMode, isMobile]);

  const closeCardSuggestions = () => {
    setActiveCardSuggestions([]);
    setActiveSuggestionIndex(0);
    setActiveSuggestionRange(null);
  };

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

    const beforeCursor = text.slice(0, selectionOffsets.start);
    const bracketMatch = beforeCursor.match(/\[([^\]\n]*)$/);
    if (!bracketMatch) {
      closeCardSuggestions();
      return;
    }

    const query = bracketMatch[1];
    const suggestionStart = selectionOffsets.start - query.length;
    const normalizedQuery = query.trim().toLowerCase();
    const suggestions = getCardSuggestions(text)
      .filter(({ name }) => !normalizedQuery || name.toLowerCase().startsWith(normalizedQuery))
      .slice(0, 6);

    if (suggestions.length === 0) {
      closeCardSuggestions();
      return;
    }

    setActiveCardSuggestions(suggestions);
    setActiveSuggestionIndex(0);
    setActiveSuggestionRange({ start: suggestionStart, end: selectionOffsets.end });
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
    requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      currentEditor.focus();
      setEditorSelectionByOffsets(currentEditor, caretOffset, caretOffset);
      refreshCardSuggestions(nextText);
    });
  };

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
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
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
          setEditorSelectionByOffsets(editor, selectionStart, selectionStart);
        } else {
          setEditorSelectionByOffsets(editor, nextValue.length, nextValue.length);
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

  const handleExample = () => {
    setComboText(EXAMPLE_COMBO);
    setSteps(parseCombo(EXAMPLE_COMBO));
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setOpenCommentStep(null);
    setActiveSavedComboId(null);
    setLastSavedCombo(null);
  };

  const handleLoadCombo = (combo: SavedCombo) => {
    setComboText(combo.text);
    setSteps(parseCombo(combo.text));
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setOpenCommentStep(null);
    setActiveSavedComboId(combo.id);
    setLastSavedCombo(combo);
  };

  const handleJumpToStep = () => {
    if (!steps.length) return;
    const requestedStep = Number.parseInt(jumpStepInput, 10);
    if (!Number.isFinite(requestedStep)) return;

    const clampedIndex = Math.min(Math.max(requestedStep, 1), steps.length) - 1;
    setActiveStepIndex(clampedIndex);
    setJumpStepInput(String(clampedIndex + 1));
  };

  const goToPreviousStep = () => {
    setActiveStepIndex((current) => Math.max(0, current - 1));
  };

  const goToNextStep = () => {
    setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1));
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
    setIsBreakdownFullMode(true);
  };

  const closeBreakdownFullMode = () => {
    setIsBreakdownFullMode(false);
  };

  const handleAddComment = () => {
    setStepComments((current) => ({
      ...current,
      [activeStepIndex]: current[activeStepIndex] ?? { text: '', x: 20, y: 18, width: 260 },
    }));
    setOpenCommentStep(activeStepIndex);
  };

  const handleCommentChange = (stepIndex: number, text: string) => {
    setStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { x: 20, y: 18, width: 260 }),
        text,
      },
    }));
  };

  const handleCommentPositionChange = (stepIndex: number, x: number, y: number) => {
    setStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { text: '', width: 260 }),
        x,
        y,
      },
    }));
  };

  const handleCommentWidthChange = (stepIndex: number, width: number) => {
    setStepComments((current) => ({
      ...current,
      [stepIndex]: {
        ...(current[stepIndex] ?? { text: '', x: 20, y: 18 }),
        width,
      },
    }));
  };

  const activeStep = steps[activeStepIndex];

  const renderBreakdownVisual = (mode: 'inline' | 'full') => {
    if (!activeStep) return null;

    return (
      <ComboStepVisual
        key={`${activeStepIndex}-${mode}`}
        className={mode === 'full' ? 'h-[78dvh] w-[92vw] max-w-[1200px] overflow-hidden' : undefined}
        action={activeStep}
        stepNumber={activeStepIndex + 1}
        comment={stepComments[activeStepIndex]}
        isCommentEditorOpen={openCommentStep === activeStepIndex}
        onOpenCommentEditor={() => setOpenCommentStep(activeStepIndex)}
        onCloseCommentEditor={() => setOpenCommentStep((current) => (current === activeStepIndex ? null : current))}
        onCommentChange={(text) => handleCommentChange(activeStepIndex, text)}
        onCommentPositionChange={(x, y) => handleCommentPositionChange(activeStepIndex, x, y)}
        onCommentWidthChange={(width) => handleCommentWidthChange(activeStepIndex, width)}
      />
    );
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="shapegrid-canvas" />
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
              <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground/50">
                e.g. Special Summon [Diabellze the White Witch] from hand and send **Susurrus of the Sinful Spoils** to the Graveyard
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const nextText = editorHtmlToComboText(e.currentTarget);
                setComboText(nextText);
                refreshCardSuggestions(nextText);
              }}
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

                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                  e.preventDefault();
                  document.execCommand('bold');
                  const editor = editorRef.current;
                  if (editor) {
                    setComboText(editorHtmlToComboText(editor));
                  }
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  document.execCommand('insertLineBreak');
                }
              }}
              onKeyUp={(e) => refreshCardSuggestions(editorHtmlToComboText(e.currentTarget))}
              onClick={(e) => refreshCardSuggestions(editorHtmlToComboText(e.currentTarget))}
              onBlur={() => {
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
                }
              }}
              className="h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/50 p-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
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
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
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
          <div className="pt-2 border-t border-border/50">
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
                activeComboId={activeSavedComboId}
                externalSavedCombo={lastSavedCombo}
                onLoad={handleLoadCombo}
                onSave={(combo) => {
                  setActiveSavedComboId(combo.id);
                  setLastSavedCombo(combo);
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
                <span className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-display font-semibold text-muted-foreground">
                  Step {activeStepIndex + 1} / {steps.length}
                </span>
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
                  className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
                >
                  {stepComments[activeStepIndex] ? 'Edit Comment' : 'Add Comment'}
                </button>
                {isMobile && (
                  <button
                    type="button"
                    onClick={openBreakdownFullMode}
                    className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-display font-semibold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Expand className="h-3.5 w-3.5" />
                      Full Mode
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={activeStepIndex === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={activeStepIndex === steps.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {renderBreakdownVisual('inline')}
              <div className="flex flex-wrap justify-center gap-2">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveStepIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeStepIndex
                        ? 'w-8 bg-primary'
                        : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {isMobile && isBreakdownFullMode && activeStep && (
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
                disabled={activeStepIndex === 0}
                className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-lg backdrop-blur transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={activeStepIndex === steps.length - 1}
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
                Step {activeStepIndex + 1} / {steps.length}
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
