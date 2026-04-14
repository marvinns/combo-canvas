import { useEffect, useRef, useState } from 'react';
import { parseCombo, type ComboAction } from '@/lib/comboParser';
import { ComboStepVisual } from '@/components/ComboStepVisual';
import { ComboLibrary } from '@/components/ComboLibrary';
import { CHAIN_LINK_BG_CLASS, CHAIN_LINK_BORDER_CLASS, CHAIN_LINK_TEXT_CLASS, ChainLinkIcon, EFFECT_STYLES, EffectGlyph, PHASE_BG_CLASS, PHASE_BORDER_CLASS, PHASE_TEXT_CLASS, PhaseIcon } from '@/components/ActionIcon';
import type { SavedCombo } from '@/lib/comboLibrary';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedGradientText } from '@/components/AnimatedGradientText';

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

export default function Index() {
  const [comboText, setComboText] = useState('');
  const [steps, setSteps] = useState<ComboAction[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [jumpStepInput, setJumpStepInput] = useState('');
  const [showQuickInserts, setShowQuickInserts] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [stepComments, setStepComments] = useState<Record<number, StepComment>>({});
  const [openCommentStep, setOpenCommentStep] = useState<number | null>(null);
  const [activeSavedComboId, setActiveSavedComboId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previousHighlightedStepRef = useRef<number | null>(null);

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
  };

  const handleLoadCombo = (combo: SavedCombo) => {
    setComboText(combo.text);
    setSteps(parseCombo(combo.text));
    setActiveStepIndex(0);
    setJumpStepInput('');
    setStepComments({});
    setOpenCommentStep(null);
    setActiveSavedComboId(combo.id);
  };

  const handleJumpToStep = () => {
    if (!steps.length) return;
    const requestedStep = Number.parseInt(jumpStepInput, 10);
    if (!Number.isFinite(requestedStep)) return;

    const clampedIndex = Math.min(Math.max(requestedStep, 1), steps.length) - 1;
    setActiveStepIndex(clampedIndex);
    setJumpStepInput(String(clampedIndex + 1));
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
              onInput={(e) => setComboText(editorHtmlToComboText(e.currentTarget))}
              onKeyDown={(e) => {
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
                  setComboText(editorHtmlToComboText(editor));
                }
              }}
              className="h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/50 p-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
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
                onLoad={handleLoadCombo}
                onSave={(combo) => setActiveSavedComboId(combo.id)}
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
                <button
                  type="button"
                  onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
                  disabled={activeStepIndex === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                  disabled={activeStepIndex === steps.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <ComboStepVisual
                key={activeStepIndex}
                action={steps[activeStepIndex]}
                stepNumber={activeStepIndex + 1}
                comment={stepComments[activeStepIndex]}
                isCommentEditorOpen={openCommentStep === activeStepIndex}
                onOpenCommentEditor={() => setOpenCommentStep(activeStepIndex)}
                onCloseCommentEditor={() => setOpenCommentStep((current) => (current === activeStepIndex ? null : current))}
                onCommentChange={(text) => handleCommentChange(activeStepIndex, text)}
                onCommentPositionChange={(x, y) => handleCommentPositionChange(activeStepIndex, x, y)}
                onCommentWidthChange={(width) => handleCommentWidthChange(activeStepIndex, width)}
              />
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
      </div>
    </div>
  );
}
