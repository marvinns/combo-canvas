import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'motion/react';
import { LocateFixed } from 'lucide-react';
import type { ComboAction, ScaleSide } from '@/lib/comboParser';
import { CardDisplay, SourceZoneBadge } from './CardDisplay';
import { ActionIcon, ActionArrow, ChainLinkIcon, CHAIN_LINK_BG_CLASS, CHAIN_LINK_BORDER_CLASS, CHAIN_LINK_TEXT_CLASS, EFFECT_STYLES, PHASE_BG_CLASS, PHASE_BORDER_CLASS, PHASE_TEXT_CLASS, PhaseIcon, ScaleLeftOverlayIcon, ScaleRightOverlayIcon } from './ActionIcon';

const LABEL_TYPES: Record<string, ComboAction['type']> = {
  'Continuous Spell & Trap': 'continuous',
  'Special Summon': 'summon',
  'Ritual Summon': 'ritual',
  'Normal Summon': 'summon',
  'Summon': 'summon',
  'Send to GY': 'send-gy',
  'Activate': 'activate',
  'Target': 'target',
  'Search': 'search',
  'Add to Hand': 'search',
  'Banish': 'banish',
  'Draw': 'draw',
  'Set': 'set',
  'Tribute': 'tribute',
  'Link Summon': 'link',
  'Xyz Summon': 'xyz',
  'Synchro Summon': 'synchro',
  'Fusion Summon': 'fusion',
  'Pendulum Summon': 'pendulum',
  'Scale': 'scale',
  'Return': 'return',
  'Negate': 'negate',
  'Destroy': 'destroy',
  'Discard': 'discard',
  'Detach': 'detach',
  'Reveal': 'reveal',
};

const DEFAULT_ACTION_COLOR = { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' };
const STATUS_EFFECTS = new Set<ComboAction['type']>(['summon', 'send-gy', 'banish', 'negate']);
const CASCADE_SUMMON_TYPES = new Set<ComboAction['type']>(['fusion', 'ritual', 'link', 'xyz', 'synchro']);
const TARGET_CASCADE_TYPES = new Set<ComboAction['type']>(['negate', 'destroy', 'tribute', 'banish', 'send-gy', 'return']);
const NORMAL_SUMMON_COLOR = { text: 'text-amber-700', bg: 'bg-amber-700/15', border: 'border-amber-700/40' };
const TARGET_ONLY_STATUS_EFFECTS = new Set<ComboAction['type']>(['send-gy', 'banish', 'negate', 'destroy', 'return', 'tribute']);
const HIDDEN_STEP_LABELS = new Set(['Continuous Spell & Trap']);
const COMMENT_TEXT_CLASS = 'text-emerald-300';
const COMMENT_BG_CLASS = 'bg-emerald-300/10';
const COMMENT_BORDER_CLASS = 'border-emerald-300/30';

type StepComment = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type ComboStepVisualProps = {
  action: ComboAction;
  stepNumber: number;
  className?: string;
  comment?: StepComment;
  isCommentEditorOpen?: boolean;
  onOpenCommentEditor?: () => void;
  onCloseCommentEditor?: () => void;
  onCommentChange?: (text: string) => void;
  onCommentPositionChange?: (x: number, y: number) => void;
  onCommentWidthChange?: (width: number) => void;
};

function MaterialPlusIcon({ className }: { className?: string }) {
  const controls = useAnimation();

  return (
    <div
      className={cn(className)}
      onMouseEnter={() => controls.start('animate')}
      onMouseLeave={() => controls.start('normal')}
    >
      <motion.svg
        animate={controls}
        fill="none"
        height={36}
        initial="normal"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        variants={{
          normal: {
            rotate: 0,
          },
          animate: {
            rotate: 180,
          },
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        viewBox="0 0 24 24"
        width={36}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </motion.svg>
    </div>
  );
}

export function ComboStepVisual({
  action,
  stepNumber,
  className,
  comment,
  isCommentEditorOpen = false,
  onOpenCommentEditor,
  onCloseCommentEditor,
  onCommentChange,
  onCommentPositionChange,
  onCommentWidthChange,
}: ComboStepVisualProps) {
  const [activeCascadeIndex, setActiveCascadeIndex] = useState<number | null>(null);
  const [activeTargetCascadeIndex, setActiveTargetCascadeIndex] = useState<number | null>(null);
  const [draftComment, setDraftComment] = useState('');
  const [isDraggingComment, setIsDraggingComment] = useState(false);
  const [isCommentHovered, setIsCommentHovered] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const rawLabels = action.labels && action.labels.length > 0 ? action.labels : [action.label];
  const labelsToRender = rawLabels.filter((label) => !HIDDEN_STEP_LABELS.has(label));
  const effectTypes = rawLabels
    .map((label) => LABEL_TYPES[label])
    .filter((type): type is ComboAction['type'] => Boolean(type));
  const sourceCards = action.sourceCards && action.sourceCards.length > 0 ? action.sourceCards : [action.sourceCard];
  const sourceZones = action.sourceZones && action.sourceZones.length > 0 ? action.sourceZones : [action.sourceZone];
  const targetCards = action.targetCards && action.targetCards.length > 0
    ? action.targetCards
    : action.targetCard
      ? [action.targetCard]
      : [];
  const followUpCards = action.followUpCards && action.followUpCards.length > 0
    ? action.followUpCards
    : action.followUpCard
      ? [action.followUpCard]
      : [];
  const followUpZones = action.followUpZones && action.followUpZones.length > 0
    ? action.followUpZones
    : action.followUpCard
      ? [action.followUpZone]
      : [];
  const targetZones = action.targetZones && action.targetZones.length > 0
    ? action.targetZones
    : action.targetCard
      ? [action.targetZone]
      : [];
  const scaleSides = action.scaleSides && action.scaleSides.length > 0 ? action.scaleSides : [];
  const cardEffects = effectTypes.length > 0 ? effectTypes : [action.type];
  const isSpecialSummonStep = labelsToRender.includes('Special Summon');
  const isNormalSummonStep = labelsToRender.includes('Normal Summon');
  const isNormalIntoSpecialStep = isNormalSummonStep && isSpecialSummonStep;
  const isSelfSpecialSummonSetupStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    action.sourceCard === action.targetCard &&
    cardEffects.some((type) => type !== 'activate' && type !== 'summon');
  const isSpecialSummonSendGyStep =
    labelsToRender.includes('Special Summon') &&
    labelsToRender.includes('Send to GY') &&
    !labelsToRender.includes('Activate');
  const isSpecialIntoSendGyStep =
    labelsToRender.includes('Special Summon') &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Send to GY');
  const isNormalIntoSendGyStep =
    labelsToRender.includes('Normal Summon') &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Send to GY');
  const isSelfFollowUpSpecialSummonStep =
    labelsToRender.includes('Special Summon') &&
    action.followUpCard === action.sourceCard;
  const isTargetIntoFollowUpSpecialSummonStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    cardEffects.some((type) => type !== 'activate' && type !== 'summon') &&
    Boolean(action.followUpCard);
  const isActivateTargetSpecialSummonStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    !isTargetIntoFollowUpSpecialSummonStep &&
    !isSelfSpecialSummonSetupStep &&
    action.sourceCard !== action.targetCard;
  const isActivateAddThenDiscardStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand') &&
    labelsToRender.includes('Discard') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateRevealAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Reveal') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    followUpCards.length > 0;
  const isActivateRevealSummonStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Reveal') &&
    labelsToRender.includes('Special Summon') &&
    Boolean(action.followUpCard);
  const isActivateBanishAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isSelfReturnIntoFollowUpSpecialSummonStep =
    isTargetIntoFollowUpSpecialSummonStep &&
    action.targetCard === action.sourceCard &&
    labelsToRender.includes('Return');
  const isNormalSummonAddToHandStep =
    isNormalSummonStep &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand');
  const isTributeTargetSpecialSummonStep =
    labelsToRender.includes('Tribute') &&
    labelsToRender.includes('Target') &&
    labelsToRender.includes('Special Summon') &&
    action.sourceCard !== action.targetCard;
  const isActivateBanishStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish');
  const isActivateFusionStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Fusion Summon') &&
    sourceCards.length > 1 &&
    Boolean(action.targetCard);
  const usesTargetEffect = cardEffects.includes('target') || action.type === 'target';
  const isCompoundActivateStep = cardEffects.includes('activate') && cardEffects.length > 1 && !action.targetOnly;
  const isMultiMaterialSummon = CASCADE_SUMMON_TYPES.has(action.type) && sourceCards.length > 1 && Boolean(action.targetCard);
  const shouldUseCascadeStack = (isMultiMaterialSummon || isActivateFusionStep) && sourceCards.length > 2;
  const targetCascadeEffectType = TARGET_CASCADE_TYPES.has(action.type)
    ? action.type
    : cardEffects.find((type) => TARGET_CASCADE_TYPES.has(type));
  const shouldUseTargetCascadeStack = Boolean(targetCascadeEffectType) && targetCards.length > 2;
  const isScaleStep = action.type === 'scale' && sourceCards.length >= 1;
  const sourceEffects = cardEffects.filter((type) => {
    if (type === 'activate' || STATUS_EFFECTS.has(type)) return false;
    if (isCompoundActivateStep && !isSelfSpecialSummonSetupStep && !isSelfReturnIntoFollowUpSpecialSummonStep) return false;
    if ((isMultiMaterialSummon || isActivateFusionStep) && type === action.type) return false;
    if (isScaleStep && type === 'scale') return false;
    if (isTributeTargetSpecialSummonStep && type === 'target') return false;
    if (isActivateRevealSummonStep && type === 'reveal') return false;
    return true;
  });
  const sourceHasActivation = cardEffects.includes('activate');
  const statusEffects = cardEffects.filter((type) => STATUS_EFFECTS.has(type) || type === 'continuous');
  const summonStatus = isSpecialSummonStep ? 'special-summon' : isNormalSummonStep ? 'normal-summon' : null;
  const nonSummonStatusEffects = statusEffects.filter((type) => type !== 'summon');
  const sourceStatuses = action.targetCard
    ? ([
        ...(isNormalIntoSpecialStep
          ? ['normal-summon' as const]
          : isSelfFollowUpSpecialSummonStep
            ? []
          : isTributeTargetSpecialSummonStep
            ? []
          : isActivateTargetSpecialSummonStep
            ? []
          : isNormalIntoSendGyStep
            ? ['normal-summon' as const]
          : isTargetIntoFollowUpSpecialSummonStep
            ? []
          : action.sourceCard !== action.targetCard && summonStatus
            ? [summonStatus]
            : []),
        ...nonSummonStatusEffects.filter(
          (type) =>
            type !== 'send-gy' &&
            !(targetCards.length > 0 && !isSelfSpecialSummonSetupStep && TARGET_ONLY_STATUS_EFFECTS.has(type)),
        ),
      ])
    : ([
        ...(summonStatus ? [summonStatus] : []),
        ...nonSummonStatusEffects,
      ]);
  const targetStatuses = action.targetCard
    ? ([
        ...(isNormalIntoSpecialStep || isSelfSpecialSummonSetupStep
          ? ['special-summon' as const]
          : isSpecialSummonSendGyStep || isSpecialIntoSendGyStep || isNormalIntoSendGyStep || isNormalSummonAddToHandStep || isTargetIntoFollowUpSpecialSummonStep
            ? []
          : summonStatus
              ? [summonStatus]
              : []),
        ...(isSelfSpecialSummonSetupStep
          || isNormalSummonAddToHandStep
          || isTargetIntoFollowUpSpecialSummonStep
          ? []
          : nonSummonStatusEffects.filter((type) => type !== 'send-gy' && !(isActivateBanishStep && type === 'banish'))),
      ])
    : [];
  const displayedTargetZone =
    isSpecialIntoSendGyStep || isNormalIntoSendGyStep || isNormalSummonAddToHandStep ? undefined : action.targetZone;
  const shouldShowTargetOriginBadge =
    (labelsToRender.includes('Add to Hand') || labelsToRender.includes('Search')) &&
    Boolean(action.targetOriginZone);
  const targetZoneBadgePrefix = labelsToRender.includes('Return') ? 'To' : 'From';
  const secondaryEffectTypes = cardEffects.filter((type) => type !== 'activate');
  const arrowEffectType = isCompoundActivateStep
    ? secondaryEffectTypes[secondaryEffectTypes.length - 1] || action.type
    : cardEffects[cardEffects.length - 1] || action.type;
  const centerStatuses = action.targetCard
    ? statusEffects.filter((type) => type === 'send-gy')
    : [];
  const materialConnectorColor = (EFFECT_STYLES[action.type] || DEFAULT_ACTION_COLOR).text;
  const centerIcons = isCompoundActivateStep
    ? secondaryEffectTypes.filter(
        (type) =>
          type !== 'target' &&
          type !== 'summon' &&
          !isSelfSpecialSummonSetupStep,
      )
    : centerStatuses;
  const cardRef = useRef<HTMLDivElement>(null);
  const commentButtonRef = useRef<HTMLButtonElement>(null);
  const commentEditorRef = useRef<HTMLDivElement>(null);
  const targetMarker = (
    <div className={`rounded-full border bg-secondary/90 p-1.5 ${EFFECT_STYLES.target.border}`}>
      <LocateFixed className={`h-4 w-4 ${EFFECT_STYLES.target.text}`} strokeWidth={2.4} />
    </div>
  );
  const scaleCardsBySide: Partial<Record<ScaleSide, { name: string; zone?: ComboAction['sourceZone'] }>> = isScaleStep
    ? sourceCards.reduce<Partial<Record<ScaleSide, { name: string; zone?: ComboAction['sourceZone'] }>>>((acc, cardName, index) => {
        const side = scaleSides[index];
        if (!side) return acc;
        acc[side] = { name: cardName, zone: sourceZones[index] };
        return acc;
      }, {})
    : {};
  const topCascadeIndex = activeCascadeIndex ?? sourceCards.length - 1;
  const activeCascadeZone = shouldUseCascadeStack ? sourceZones[topCascadeIndex] : undefined;
  const topTargetCascadeIndex = activeTargetCascadeIndex ?? targetCards.length - 1;
  const activeTargetZone = shouldUseTargetCascadeStack ? targetZones[topTargetCascadeIndex] : undefined;
  const followUpStatuses = isTargetIntoFollowUpSpecialSummonStep ? (['special-summon'] as const) : [];
  const chainedPrimaryEffectType = secondaryEffectTypes.find((type) => type !== 'summon');
  const CASCADE_EXTRA_FOOTPRINT = 1;
  const sourceCascadeShift = shouldUseCascadeStack ? Math.max(0, sourceCards.length - 2) * 18 : 0;
  const sourceCascadeWrapperStyle = shouldUseCascadeStack
    ? { marginLeft: `${36 + CASCADE_EXTRA_FOOTPRINT - sourceCascadeShift}px` }
    : undefined;
  const sourceCascadeRightStyle = shouldUseCascadeStack
    ? { marginLeft: `${44 + sourceCascadeShift + CASCADE_EXTRA_FOOTPRINT}px` }
    : undefined;
  const targetCascadeShift = shouldUseTargetCascadeStack ? Math.max(0, targetCards.length - 2) * 18 : 0;
  const targetCascadeWrapperStyle = shouldUseTargetCascadeStack
    ? { marginLeft: `${12}px` }
    : undefined;
  const targetCascadeRightStyle = shouldUseTargetCascadeStack
    ? { marginLeft: `${40 + targetCascadeShift + CASCADE_EXTRA_FOOTPRINT}px` }
    : undefined;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 90;
    const distX = Math.max(0, 1 - Math.min(x, rect.width - x) / (rect.width / 2));
    const distY = Math.max(0, 1 - Math.min(y, rect.height - y) / (rect.height / 2));
    const proximity = Math.min(100, Math.max(distX, distY) * 100);
    el.style.setProperty('--cursor-angle', `${angle}deg`);
    el.style.setProperty('--edge-proximity', `${proximity}`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--edge-proximity', '0');
  }, []);

  useEffect(() => {
    setDraftComment(comment?.text ?? '');
  }, [comment?.text, stepNumber]);

  useEffect(() => {
    if (!isCommentEditorOpen || !commentEditorRef.current || !onCommentWidthChange) return;

    const editor = commentEditorRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      if (comment && nextWidth !== comment.width) {
        onCommentWidthChange(nextWidth);
      }
    });

    resizeObserver.observe(editor);
    return () => resizeObserver.disconnect();
  }, [comment, isCommentEditorOpen, onCommentWidthChange]);

  useEffect(() => {
    if (!isCommentEditorOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (commentEditorRef.current?.contains(target)) return;
      if (commentButtonRef.current?.contains(target)) return;

      onCloseCommentEditor?.();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isCommentEditorOpen, onCloseCommentEditor]);

  const clampCommentPosition = useCallback((x: number, y: number) => {
    const container = cardRef.current;
    if (!container) return { x, y };

    const containerRect = container.getBoundingClientRect();
    const buttonRect = commentButtonRef.current?.getBoundingClientRect();
    const buttonWidth = buttonRect?.width ?? 44;
    const buttonHeight = buttonRect?.height ?? 44;

    return {
      x: Math.max(12, Math.min(x, containerRect.width - buttonWidth - 12)),
      y: Math.max(60, Math.min(y, containerRect.height - buttonHeight - 12)),
    };
  }, []);

  const handleCommentPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!comment) return;

    const buttonRect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - buttonRect.left,
      y: event.clientY - buttonRect.top,
    };

    setIsDraggingComment(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [comment]);

  const handleCommentPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingComment || !comment || !onCommentPositionChange) return;

    const container = cardRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const nextX = event.clientX - containerRect.left - dragOffsetRef.current.x;
    const nextY = event.clientY - containerRect.top - dragOffsetRef.current.y;
    const clamped = clampCommentPosition(nextX, nextY);
    onCommentPositionChange(clamped.x, clamped.y);
  }, [clampCommentPosition, comment, isDraggingComment, onCommentPositionChange]);

  const handleCommentPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingComment) return;
    setIsDraggingComment(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [isDraggingComment]);

  const handleSaveComment = useCallback(() => {
    onCommentChange?.(draftComment);
    onCloseCommentEditor?.();
  }, [draftComment, onCloseCommentEditor, onCommentChange]);

  const commentIcon = React.createElement('lord-icon', {
    src: 'https://cdn.lordicon.com/wwsllqpi.json',
    trigger: 'click',
    colors: 'primary:#6ee7b7',
    style: { width: '28px', height: '28px' },
  });

  return (
    <div
      ref={cardRef}
      className={cn("border-glow-card", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {comment && (
        <>
          <button
            ref={commentButtonRef}
            type="button"
            onClick={() => {
              if (!isDraggingComment) {
                onOpenCommentEditor?.();
              }
            }}
            onPointerDown={handleCommentPointerDown}
            onPointerMove={handleCommentPointerMove}
            onPointerUp={handleCommentPointerUp}
            onPointerCancel={handleCommentPointerUp}
            onMouseEnter={() => setIsCommentHovered(true)}
            onMouseLeave={() => setIsCommentHovered(false)}
            className={cn(
              'absolute z-20 flex h-11 w-11 items-center justify-center rounded-full border bg-secondary/75 backdrop-blur-sm shadow-lg transition-all',
              COMMENT_BG_CLASS,
              COMMENT_BORDER_CLASS,
              isDraggingComment ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105',
            )}
            style={{ left: `${comment.x}px`, top: `${comment.y}px` }}
            aria-label="Open step comment"
          >
            {commentIcon}
          </button>
          {!isCommentEditorOpen && isCommentHovered && comment.text.trim().length > 0 && (
            <div
              className="pointer-events-none absolute z-20 max-w-[520px] rounded-2xl border border-white/10 bg-background/30 p-3 shadow-2xl backdrop-blur-md"
              style={{
                left: `${Math.min(comment.x + 52, 420)}px`,
                top: `${Math.max(comment.y - 8, 72)}px`,
                width: `${comment.width}px`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`text-xs font-display ${COMMENT_TEXT_CLASS}`}>Step Note</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
                {comment.text}
              </p>
            </div>
          )}
          {isCommentEditorOpen && (
            <div
              ref={commentEditorRef}
              className="absolute z-20 min-w-[180px] max-w-[520px] resize-x overflow-auto rounded-2xl border border-white/10 bg-background/35 p-3 shadow-2xl backdrop-blur-md"
              style={{
                left: `${Math.min(comment.x + 52, 420)}px`,
                top: `${Math.max(comment.y - 8, 72)}px`,
                width: `${comment.width}px`,
              }}
            >
              <textarea
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
                placeholder="Write a comment for this step..."
                className="min-h-[96px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`text-xs font-display ${COMMENT_TEXT_CLASS}`}>Step Note</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCloseCommentEditor}
                    className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-display font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveComment}
                    className={`rounded-full border px-3 py-1 text-xs font-display font-semibold transition-colors ${COMMENT_TEXT_CLASS} ${COMMENT_BG_CLASS} ${COMMENT_BORDER_CLASS}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div className="edge-light" />
      <div className="border-glow-inner p-6 gap-4">
        {/* Step label */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display font-bold text-sm text-white bg-sky-300/10 px-3 py-1 rounded-full border border-sky-300/30">
            Step {stepNumber}
          </span>
          {action.phase && (
            <>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${PHASE_BG_CLASS} ${PHASE_BORDER_CLASS}`}>
                <PhaseIcon className={PHASE_TEXT_CLASS} />
              </span>
              <span className={`font-display font-semibold text-sm px-3 py-1 rounded-full border ${PHASE_TEXT_CLASS} ${PHASE_BG_CLASS} ${PHASE_BORDER_CLASS}`}>
                {action.phase}
              </span>
            </>
          )}
          {action.chainLink !== undefined && (
            <>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${CHAIN_LINK_BG_CLASS} ${CHAIN_LINK_BORDER_CLASS}`}>
                <ChainLinkIcon className={CHAIN_LINK_TEXT_CLASS} />
              </span>
              <span className={`font-display font-semibold text-sm px-3 py-1 rounded-full border ${CHAIN_LINK_TEXT_CLASS} ${CHAIN_LINK_BG_CLASS} ${CHAIN_LINK_BORDER_CLASS}`}>
                Chain Link {action.chainLink}
              </span>
            </>
          )}
          {labelsToRender.map((lbl) => {
            const labelType = LABEL_TYPES[lbl];
            const color = lbl === 'Normal Summon'
              ? NORMAL_SUMMON_COLOR
              : labelType
                ? EFFECT_STYLES[labelType]
                : DEFAULT_ACTION_COLOR;
            return (
              <span key={lbl} className={`font-display font-semibold text-sm px-3 py-1 rounded-full ${color.text} ${color.bg} ${color.border} border`}>
                {lbl}
              </span>
            );
          })}
        </div>

        {/* Visual */}
        <div className="flex items-start justify-center gap-2 flex-wrap">
          {action.targetOnly && action.targetCard && (
            <CardDisplay
              name={action.targetCard}
              actionType={action.type}
              useStarBorder
              zone={action.targetZone}
              statuses={action.type === 'continuous' ? ['continuous'] : []}
              topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
            />
          )}

          {!action.targetOnly && isScaleStep && (
            <div className="flex w-full max-w-4xl items-start justify-between gap-6">
              <div className="flex min-w-[140px] justify-start">
                {scaleCardsBySide.left ? (
                  <CardDisplay
                    name={scaleCardsBySide.left.name}
                    actionType={action.type}
                    useStarBorder
                    zone={scaleCardsBySide.left.zone}
                    centerOverlay={
                      <ScaleLeftOverlayIcon className="h-12 w-12" />
                    }
                  />
                ) : (
                  <div className="w-[140px]" />
                )}
              </div>
              <div className="flex min-w-[140px] justify-end">
                {scaleCardsBySide.right ? (
                  <CardDisplay
                    name={scaleCardsBySide.right.name}
                    actionType={action.type}
                    useStarBorder
                    zone={scaleCardsBySide.right.zone}
                    centerOverlay={
                      <ScaleRightOverlayIcon className="h-12 w-12" />
                    }
                  />
                ) : (
                  <div className="w-[140px]" />
                )}
              </div>
            </div>
          )}

          {!action.targetOnly && !isScaleStep && (
            <>
          {isActivateFusionStep && (
            <>
                <CardDisplay
                  name={action.sourceCard}
                  actionType={action.type}
                  useStarBorder
                  zone={action.sourceZone}
                  leftEffectTypes={[]}
                  statuses={[]}
                  isActivated={sourceHasActivation}
                />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="fusion" />
                </div>
                <ActionArrow type="fusion" />
              </div>
            </>
          )}

          {isMultiMaterialSummon && !isActivateFusionStep && (
            <div className="flex h-[270px] w-[132px] flex-col items-center justify-center gap-3 self-start">
              <ActionIcon type={action.type} />
              {shouldUseCascadeStack && (
                <SourceZoneBadge zone={activeCascadeZone} className="w-[132px] justify-center" />
              )}
            </div>
          )}

          {shouldUseCascadeStack ? (
            <div className="relative flex h-[270px] w-[200px] items-center justify-center" style={sourceCascadeWrapperStyle}>
              <div className="card-swap-container">
                {sourceCards.map((cardName, index) => {
                  const stackIndex = sourceCards.length - index - 1;
                  return (
                    <button
                      type="button"
                      key={`${cardName}-${index}`}
                      className="card"
                      onClick={() => setActiveCascadeIndex(index)}
                      style={{
                        ['--stack-x' as string]: `${stackIndex * 30}px`,
                        ['--stack-y' as string]: `${stackIndex * 24}px`,
                        ['--stack-rotate' as string]: '-1deg',
                        ['--stack-delay' as string]: `${index * 0.12}s`,
                        zIndex: index === topCascadeIndex ? sourceCards.length + 10 : index + 1,
                      }}
                      aria-label={`Bring ${cardName} to front`}
                    >
                      <CardDisplay
                        name={cardName}
                        actionType={action.type}
                        zone={sourceZones[index]}
                        compact
                        showZoneBadge={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            sourceCards.map((cardName, index) => (
              <div key={`${cardName}-${index}`} className="flex items-start gap-2">
                {index > 0 && (
                  <div className="flex h-[270px] items-center self-start">
                    <MaterialPlusIcon className={`h-13 w-13 ${materialConnectorColor}`} />
                  </div>
                )}
                <CardDisplay
                  name={cardName}
                  actionType={action.type}
                  useStarBorder={action.type !== 'fusion'}
                  zone={sourceZones[index]}
                  leftEffectTypes={index === 0 ? sourceEffects : []}
                  statuses={index === 0 ? sourceStatuses : []}
                  isActivated={index === 0 && sourceHasActivation && !isActivateFusionStep}
                />
              </div>
            ))
          )}

          {isSelfReturnIntoFollowUpSpecialSummonStep && action.followUpCard && (
            <>
              <div className="flex h-[275px] items-center self-start" style={sourceCascadeRightStyle}>
                <ActionArrow type="summon" />
              </div>
              <CardDisplay
                name={action.followUpCard}
                actionType="summon"
                zone={action.followUpZone}
                statuses={[...followUpStatuses]}
              />
            </>
          )}

          {isActivateRevealAddStep && action.targetCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="reveal" />
                </div>
                <ActionArrow type="reveal" />
              </div>
              <CardDisplay
                name={action.targetCard}
                actionType="reveal"
                statuses={[]}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="search" />
                </div>
                <ActionArrow type="search" />
              </div>
              <div className="flex flex-wrap items-start justify-center gap-3">
                {followUpCards.map((cardName, index) => (
                  <CardDisplay
                    key={`${cardName}-${index}`}
                    name={cardName}
                    actionType="search"
                    zone={followUpZones[index]}
                    statuses={[]}
                  />
                ))}
              </div>
            </>
          )}

          {isActivateAddThenDiscardStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="search" />
                </div>
                <ActionArrow type="search" />
                {shouldShowTargetOriginBadge && (
                  <SourceZoneBadge zone={action.targetOriginZone} className="min-w-[88px] justify-center" />
                )}
              </div>
              <CardDisplay
                name={action.targetCard}
                actionType="search"
                zone={action.targetZone}
                statuses={[]}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="discard" />
                </div>
                <ActionArrow type="discard" />
              </div>
              <CardDisplay
                name={action.followUpCard}
                actionType="discard"
                zone={action.followUpZone}
                statuses={['discard']}
              />
            </>
          )}

          {isActivateBanishAddStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="banish" />
                </div>
                <ActionArrow type="banish" />
              </div>
              <CardDisplay
                name={action.targetCard}
                actionType="banish"
                zone={action.targetZone}
                statuses={[]}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="search" />
                </div>
                <ActionArrow type="search" />
                {shouldShowTargetOriginBadge && (
                  <SourceZoneBadge zone={action.targetOriginZone} className="min-w-[88px] justify-center" />
                )}
              </div>
              <CardDisplay
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isTargetIntoFollowUpSpecialSummonStep && !isActivateAddThenDiscardStep && !isActivateBanishAddStep && !isSelfReturnIntoFollowUpSpecialSummonStep && action.targetCard && action.followUpCard && chainedPrimaryEffectType && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={chainedPrimaryEffectType} />
                </div>
                <ActionArrow type={chainedPrimaryEffectType} />
                {shouldUseTargetCascadeStack && displayedTargetZone && (
                  <SourceZoneBadge zone={activeTargetZone} prefix={targetZoneBadgePrefix} className="min-w-[88px] justify-center" />
                )}
              </div>
              {shouldUseTargetCascadeStack ? (
                <div className="relative flex h-[270px] w-[200px] items-center justify-center" style={targetCascadeWrapperStyle}>
                  <div className="card-swap-container">
                    {targetCards.map((cardName, index) => {
                      const stackIndex = targetCards.length - index - 1;
                      return (
                        <button
                          type="button"
                          key={`${cardName}-${index}`}
                          className="card"
                          onClick={() => setActiveTargetCascadeIndex(index)}
                          style={{
                            ['--stack-x' as string]: `${stackIndex * 30}px`,
                            ['--stack-y' as string]: `${stackIndex * 24}px`,
                            ['--stack-rotate' as string]: '1deg',
                            ['--stack-delay' as string]: `${index * 0.12}s`,
                            zIndex: index === topTargetCascadeIndex ? targetCards.length + 10 : index + 1,
                          }}
                          aria-label={`Bring ${cardName} to front`}
                        >
                          <CardDisplay
                            name={cardName}
                            actionType={action.type}
                            zone={displayedTargetZone ? targetZones[index] : undefined}
                            statuses={[]}
                            compact
                            showZoneBadge={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <CardDisplay
                  name={action.targetCard}
                  actionType={action.type}
                  zone={action.targetZone}
                  statuses={[]}
                />
              )}
              <div className="flex h-[275px] items-center self-start" style={targetCascadeRightStyle}>
                <ActionArrow type="summon" />
              </div>
              <CardDisplay
                name={action.followUpCard}
                actionType="summon"
                zone={action.followUpZone}
                statuses={[...followUpStatuses]}
              />
            </>
          )}

          {!isActivateRevealAddStep && !isActivateAddThenDiscardStep && !isActivateBanishAddStep && !isTargetIntoFollowUpSpecialSummonStep && !isActivateFusionStep && targetCards.length > 0 && (
            <>
              <div
                className={
                  centerIcons.length > 0
                    ? 'flex flex-col items-center gap-2 self-center'
                    : 'flex h-[275px] items-center self-start'
                }
                style={sourceCascadeRightStyle}
              >
                {centerIcons.length > 0 ? (
                  <>
                    <div className="flex min-h-8 items-center justify-center gap-2">
                      {centerIcons.map((type, index) => (
                        <ActionIcon key={`${type}-${index}`} type={type} />
                      ))}
                    </div>
                    <ActionArrow type={arrowEffectType} />
                  </>
                ) : (
                  <ActionArrow type={arrowEffectType} />
                )}
                {shouldUseTargetCascadeStack && displayedTargetZone && (
                  <SourceZoneBadge zone={activeTargetZone} prefix={targetZoneBadgePrefix} className="min-w-[88px] justify-center" />
                )}
                {!shouldUseTargetCascadeStack && shouldShowTargetOriginBadge && (
                  <SourceZoneBadge zone={action.targetOriginZone} className="min-w-[88px] justify-center" />
                )}
              </div>
              {shouldUseTargetCascadeStack ? (
                <div className="relative flex h-[270px] w-[200px] items-center justify-center" style={targetCascadeWrapperStyle}>
                  <div className="card-swap-container">
                    {targetCards.map((cardName, index) => {
                      const stackIndex = targetCards.length - index - 1;
                      return (
                        <button
                          type="button"
                          key={`${cardName}-${index}`}
                          className="card"
                          onClick={() => setActiveTargetCascadeIndex(index)}
                          style={{
                            ['--stack-x' as string]: `${stackIndex * 30}px`,
                            ['--stack-y' as string]: `${stackIndex * 24}px`,
                            ['--stack-rotate' as string]: '1deg',
                            ['--stack-delay' as string]: `${index * 0.12}s`,
                            zIndex: index === topTargetCascadeIndex ? targetCards.length + 10 : index + 1,
                          }}
                          aria-label={`Bring ${cardName} to front`}
                        >
                          <CardDisplay
                            name={cardName}
                            actionType={action.type}
                            zone={displayedTargetZone ? targetZones[index] : undefined}
                            statuses={targetStatuses}
                            compact
                            showZoneBadge={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : targetCards.length > 1 ? (
                <div className="flex flex-wrap items-start gap-3">
                  {targetCards.map((cardName, index) => (
                    <CardDisplay
                      key={`${cardName}-${index}`}
                      name={cardName}
                      actionType={action.type}
                      zone={displayedTargetZone ? targetZones[index] : undefined}
                      statuses={targetStatuses}
                      topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                    />
                  ))}
                </div>
              ) : (
                <CardDisplay
                  name={targetCards[0]}
                  actionType={action.type}
                  zone={displayedTargetZone}
                  statuses={targetStatuses}
                  topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                />
              )}
            </>
          )}

          {isActivateFusionStep && action.targetCard && (
            <>
              <div className="flex h-[275px] items-center self-start" style={sourceCascadeRightStyle}>
                <ActionArrow type="fusion" />
              </div>
              <CardDisplay
                name={action.targetCard}
                actionType="fusion"
                zone={action.targetZone}
                statuses={['fusion']}
              />
            </>
          )}

          {targetCards.length === 0 && null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
