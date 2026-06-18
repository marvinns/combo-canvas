import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'motion/react';
import { GripVertical, Link2, LocateFixed, Trash2 } from 'lucide-react';
import type { ComboAction, ScaleSide } from '@/lib/comboParser';
import { CardDisplay, CardDisplaySizeProvider, SourceZoneBadge, type CardDisplaySize } from './CardDisplay';
import { ActionIcon, ActionArrow, ChainLinkIcon, CHAIN_LINK_BG_CLASS, CHAIN_LINK_BORDER_CLASS, CHAIN_LINK_TEXT_CLASS, EFFECT_STYLES, PHASE_BG_CLASS, PHASE_BORDER_CLASS, PHASE_TEXT_CLASS, PhaseIcon, ScaleLeftOverlayIcon, ScaleRightOverlayIcon } from './ActionIcon';

const LABEL_TYPES: Record<string, ComboAction['type']> = {
  'Continuous Spell & Trap': 'continuous',
  'Field Spell Zone': 'field-spell',
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
const HIDDEN_STEP_LABELS = new Set(['Continuous Spell & Trap', 'Field Spell Zone']);
const COMMENT_TEXT_CLASS = 'text-emerald-300';
const COMMENT_BG_CLASS = 'bg-emerald-300/10';
const COMMENT_BORDER_CLASS = 'border-emerald-300/30';
const LINK_TEXT_CLASS = 'text-cyan-200';
const LINK_BG_CLASS = 'bg-cyan-300/10';
const LINK_BORDER_CLASS = 'border-cyan-300/30';
const MIN_LINK_WIDTH = 150;
const MAX_LINK_WIDTH = 420;

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

type ComboStepVisualProps = {
  action: ComboAction;
  stepNumber: number;
  stepLabel?: string;
  className?: string;
  cardSize?: CardDisplaySize;
  comment?: StepComment;
  isCommentEditorOpen?: boolean;
  onOpenCommentEditor?: () => void;
  onCloseCommentEditor?: () => void;
  onCommentChange?: (text: string) => void;
  onCommentDelete?: () => void;
  onCommentPositionChange?: (x: number, y: number) => void;
  onCommentWidthChange?: (width: number) => void;
  links?: StepLink[];
  onLinkLabelChange?: (linkId: string, label: string) => void;
  onLinkDelete?: (linkId: string) => void;
  onLinkPositionChange?: (linkId: string, x: number, y: number) => void;
  onLinkWidthChange?: (linkId: string, width: number) => void;
  onOpenLink?: (link: StepLink) => void;
};

function getCustomCardTag(raw: string, cardName: string): string | undefined {
  const escapedCardName = cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixTagMatch = raw.match(new RegExp(`\\(([^()[\\]\\n]+)\\)\\s*\\[${escapedCardName}\\]`, 'i'));
  const suffixTagMatch = raw.match(new RegExp(`\\[${escapedCardName}\\]\\s*\\(([^()[\\]\\n]+)\\)`, 'i'));
  return (prefixTagMatch?.[1] || suffixTagMatch?.[1])?.trim();
}

function getCustomStepTags(raw: string): string[] {
  const seen = new Set<string>();

  return [...raw.matchAll(/"([^"\n]+)"/g)].flatMap((match) => {
    const tag = match[1].trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return [];
    seen.add(key);
    return [tag];
  });
}

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
  stepLabel,
  className,
  cardSize = 'default',
  comment,
  isCommentEditorOpen = false,
  onOpenCommentEditor,
  onCloseCommentEditor,
  onCommentChange,
  onCommentDelete,
  onCommentPositionChange,
  onCommentWidthChange,
  links = [],
  onLinkLabelChange,
  onLinkDelete,
  onLinkPositionChange,
  onLinkWidthChange,
  onOpenLink,
}: ComboStepVisualProps) {
  const [activeCascadeIndex, setActiveCascadeIndex] = useState<number | null>(null);
  const [activeTargetCascadeIndex, setActiveTargetCascadeIndex] = useState<number | null>(null);
  const [draftComment, setDraftComment] = useState('');
  const [isDraggingComment, setIsDraggingComment] = useState(false);
  const [isCommentHovered, setIsCommentHovered] = useState(false);
  const [commentEditorHeight, setCommentEditorHeight] = useState(0);
  const [commentPreviewHeight, setCommentPreviewHeight] = useState(0);
  const [dragCommentPosition, setDragCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragLinkId, setDragLinkId] = useState<string | null>(null);
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [dragLinkPositions, setDragLinkPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [resizeLinkId, setResizeLinkId] = useState<string | null>(null);
  const [dragLinkWidths, setDragLinkWidths] = useState<Record<string, number>>({});
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const pendingDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const didDragCommentRef = useRef(false);
  const linkDragOffsetRef = useRef({ x: 0, y: 0 });
  const linkDragFrameRef = useRef<number | null>(null);
  const pendingLinkDragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const didDragLinkRef = useRef(false);
  const linkResizeFrameRef = useRef<number | null>(null);
  const pendingLinkWidthRef = useRef<{ id: string; width: number } | null>(null);
  const linkResizeStartRef = useRef({ clientX: 0, width: 0 });
  const rawLabels = action.labels && action.labels.length > 0 ? action.labels : [action.label];
  const isDesktopFullCardSize = cardSize === 'desktop-full';
  const cardWidth = isDesktopFullCardSize ? 176 : 140;
  const cardHeight = isDesktopFullCardSize ? 257 : 204;
  const topBadgeRailHeight = 64;
  const visualColumnHeight = (topBadgeRailHeight * 2) + cardHeight;
  const arrowColumnHeight = visualColumnHeight + 5;
  const iconColumnWidth = isDesktopFullCardSize ? 128 : 112;
  const cascadeWidth = isDesktopFullCardSize ? 236 : 200;
  const visualColumnStyle = { height: `${visualColumnHeight}px` };
  const arrowColumnStyle = { height: `${arrowColumnHeight}px` };
  const iconColumnStyle = { height: `${visualColumnHeight}px`, width: `${iconColumnWidth}px` };
  const cascadeBoxStyle = { height: `${visualColumnHeight}px`, width: `${cascadeWidth}px` };
  const labelsToRender = rawLabels.filter((label) => !HIDDEN_STEP_LABELS.has(label));
  const customStepTags = getCustomStepTags(action.raw);
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
  const isMaterialSendGySummonStep =
    isSpecialSummonSendGyStep &&
    action.sourceCard === action.targetCard;
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
    labelsToRender.indexOf('Special Summon') === labelsToRender.length - 1 &&
    !labelsToRender.includes('Add to Hand') &&
    cardEffects.some((type) => type !== 'activate' && type !== 'summon') &&
    Boolean(action.followUpCard);
  const isActivateTargetSpecialSummonStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    !labelsToRender.includes('Add to Hand') &&
    !isTargetIntoFollowUpSpecialSummonStep &&
    !isSelfSpecialSummonSetupStep &&
    action.sourceCard !== action.targetCard;
  const isActivateSelfSummonStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    action.sourceCard === action.targetCard &&
    !action.followUpCard;
  const isActivateSelfSetStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Set') &&
    action.sourceCard === action.targetCard &&
    !action.followUpCard;
  const isActivateAddThenDiscardStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand') &&
    labelsToRender.includes('Discard') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateDiscardBeforeAddStep =
    isActivateAddThenDiscardStep &&
    labelsToRender.indexOf('Discard') < labelsToRender.indexOf('Add to Hand');
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
  const isActivateSummonAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const specialSummonLabelIndex = labelsToRender.indexOf('Special Summon');
  const destroyLabelIndex = labelsToRender.indexOf('Destroy');
  const isActivateSummonDestroyStep =
    labelsToRender.includes('Activate') &&
    specialSummonLabelIndex >= 0 &&
    destroyLabelIndex >= 0 &&
    specialSummonLabelIndex < destroyLabelIndex &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateDestroySummonStep =
    labelsToRender.includes('Activate') &&
    specialSummonLabelIndex >= 0 &&
    destroyLabelIndex >= 0 &&
    destroyLabelIndex < specialSummonLabelIndex &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateBanishAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateBanishReturnStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish') &&
    labelsToRender.includes('Return') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateTributeAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Tribute') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateSendAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Send to GY') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateGenericPrimaryAddStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand') &&
    labelsToRender.indexOf('Add to Hand') > 1 &&
    Boolean(action.targetCard) &&
    (Boolean(action.followUpCard) || followUpCards.length > 0) &&
    !isActivateRevealAddStep &&
    !isActivateAddThenDiscardStep &&
    !isActivateBanishAddStep &&
    !isActivateTributeAddStep &&
    !isActivateSendAddStep &&
    !isActivateSummonAddStep;
  const isGenericPrimarySummonAddStep =
    !labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isGenericPrimaryAddStep =
    !labelsToRender.includes('Activate') &&
    !labelsToRender.includes('Special Summon') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    (Boolean(action.followUpCard) || followUpCards.length > 0);
  const isSimpleGenericAddStep =
    !labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    !action.followUpCard;
  const isGenericPrimaryIntoFollowUpSpecialSummonStep =
    !labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    !labelsToRender.includes('Add to Hand') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard);
  const isActivateGenericFollowUpStep =
    labelsToRender.includes('Activate') &&
    Boolean(action.targetCard) &&
    Boolean(action.followUpCard) &&
    !isActivateRevealAddStep &&
    !isActivateAddThenDiscardStep &&
    !isActivateBanishAddStep &&
    !isActivateBanishReturnStep &&
    !isActivateTributeAddStep &&
    !isActivateSendAddStep &&
    !isActivateGenericPrimaryAddStep &&
    !isActivateSummonAddStep &&
    !isActivateSummonDestroyStep &&
    !isActivateDestroySummonStep &&
    !isTargetIntoFollowUpSpecialSummonStep;
  const isSelfReturnIntoFollowUpSpecialSummonStep =
    isTargetIntoFollowUpSpecialSummonStep &&
    action.targetCard === action.sourceCard &&
    labelsToRender.includes('Return');
  const isNormalSummonAddToHandStep =
    isNormalSummonStep &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand');
  const isSpecialSummonAddToHandStep =
    isSpecialSummonStep &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Add to Hand') &&
    !action.followUpCard &&
    action.sourceCard !== action.targetCard;
  const isTributeTargetSpecialSummonStep =
    labelsToRender.includes('Tribute') &&
    labelsToRender.includes('Target') &&
    labelsToRender.includes('Special Summon') &&
    action.sourceCard !== action.targetCard;
  const isActivateBanishStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish');
  const isBanishMaterialSummonStep =
    !labelsToRender.includes('Activate') &&
    labelsToRender.includes('Banish') &&
    labelsToRender.includes('Special Summon') &&
    sourceCards.length > 0 &&
    Boolean(action.targetCard);
  const isLeadingEffectMaterialSummonStep =
    !labelsToRender.includes('Activate') &&
    labelsToRender.includes('Special Summon') &&
    sourceCards.length > 0 &&
    Boolean(action.targetCard) &&
    cardEffects.some((type) => type !== 'summon');
  const isActivateFusionStep =
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Fusion Summon') &&
    sourceCards.length > 0 &&
    Boolean(action.targetCard);
  const isActivateSimpleTwoCardStep =
    labelsToRender.includes('Activate') &&
    Boolean(action.targetCard) &&
    !action.followUpCard &&
    sourceCards.length === 1 &&
    targetCards.length === 1 &&
    !labelsToRender.includes('Special Summon') &&
    !labelsToRender.includes('Add to Hand') &&
    !labelsToRender.includes('Fusion Summon') &&
    !labelsToRender.includes('Scale') &&
    !isActivateSelfSummonStep &&
    !isActivateSelfSetStep;
  const usesTargetEffect = cardEffects.includes('target') || action.type === 'target';
  const isCompoundActivateStep = cardEffects.includes('activate') && cardEffects.length > 1 && !action.targetOnly;
  const isMultiMaterialSummon = CASCADE_SUMMON_TYPES.has(action.type) && sourceCards.length > 1 && Boolean(action.targetCard);
  const shouldUseCascadeStack =
    (isMultiMaterialSummon || isActivateFusionStep || isLeadingEffectMaterialSummonStep) &&
    sourceCards.length > 2;
  const targetCascadeEffectType = TARGET_CASCADE_TYPES.has(action.type)
    ? action.type
    : cardEffects.find((type) => TARGET_CASCADE_TYPES.has(type));
  const shouldAttachTargetOriginZone =
    targetCascadeEffectType === 'send-gy' ||
    targetCascadeEffectType === 'return';
  const isPendulumTargetCascadeStep = action.type === 'pendulum' && targetCards.length > 3;
  const shouldUseTargetCascadeStack = Boolean(targetCascadeEffectType) && (
    targetCards.length > 2 ||
    ((isTargetIntoFollowUpSpecialSummonStep || isGenericPrimaryIntoFollowUpSpecialSummonStep) && targetCascadeEffectType === 'send-gy' && targetCards.length > 1)
  ) || isPendulumTargetCascadeStep;
  const isScaleStep = action.type === 'scale' && sourceCards.length >= 1;
  const scaleActivateEffectType = labelsToRender
    .filter((label) => label !== 'Scale' && label !== 'Activate')
    .map((label) => LABEL_TYPES[label])
    .find((type): type is ComboAction['type'] => Boolean(type));
  const isScaleActivateTargetStep =
    isScaleStep &&
    labelsToRender.includes('Activate') &&
    Boolean(scaleActivateEffectType) &&
    Boolean(action.targetCard);
  const isActivateScaleStep =
    !isScaleStep &&
    labelsToRender.includes('Activate') &&
    labelsToRender.includes('Scale') &&
    targetCards.length > 0;
  const sourceEffects = cardEffects.filter((type) => {
    if (
      type === 'activate' ||
      type === 'continuous' ||
      type === 'field-spell' ||
      (STATUS_EFFECTS.has(type) && !(isBanishMaterialSummonStep && type === 'banish'))
    ) return false;
    if (isCompoundActivateStep && !isSelfSpecialSummonSetupStep && !isSelfReturnIntoFollowUpSpecialSummonStep) return false;
    if ((isMultiMaterialSummon || isActivateFusionStep) && type === action.type) return false;
    if (isScaleStep && type === 'scale') return false;
    if (isTributeTargetSpecialSummonStep && type === 'target') return false;
    if (isActivateRevealSummonStep && type === 'reveal') return false;
    if (isTargetIntoFollowUpSpecialSummonStep && type !== 'summon') return false;
    if (isSimpleGenericAddStep && type === 'search') return false;
    return true;
  });
  const sourceHasActivation = cardEffects.includes('activate');
  const statusEffects = cardEffects.filter((type) => STATUS_EFFECTS.has(type) || type === 'continuous' || type === 'field-spell');
  const summonStatus = isSpecialSummonStep ? 'special-summon' : isNormalSummonStep ? 'normal-summon' : null;
  const nonSummonStatusEffects = statusEffects.filter((type) => type !== 'summon');
  const selfSummonTransferredStatuses = isSelfSpecialSummonSetupStep
    ? nonSummonStatusEffects.filter((type) => type === 'banish')
    : [];
  const sourceStatuses = action.targetCard
    ? ([
        ...(isNormalSummonStep
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
          : isGenericPrimaryIntoFollowUpSpecialSummonStep || isGenericPrimarySummonAddStep
            ? []
          : action.sourceCard !== action.targetCard && summonStatus
            ? [summonStatus]
            : []),
        ...nonSummonStatusEffects.filter(
          (type) =>
            type !== 'continuous' &&
            type !== 'field-spell' &&
            type !== 'send-gy' &&
            !(isSelfSpecialSummonSetupStep && type === 'banish') &&
            !(targetCards.length > 0 && !isSelfSpecialSummonSetupStep && TARGET_ONLY_STATUS_EFFECTS.has(type)),
        ),
        ...(action.type === 'discard' ? ['discard' as const] : []),
      ])
    : ([
        ...(summonStatus ? [summonStatus] : []),
        ...nonSummonStatusEffects,
      ]);
  const targetStatuses = action.targetCard
    ? ([
        ...(isNormalIntoSpecialStep || isSelfSpecialSummonSetupStep
          ? ['special-summon' as const]
          : (isSpecialSummonSendGyStep && !isMaterialSendGySummonStep) || isSpecialIntoSendGyStep || isNormalIntoSendGyStep || isNormalSummonAddToHandStep || isSpecialSummonAddToHandStep || isTargetIntoFollowUpSpecialSummonStep || isGenericPrimaryIntoFollowUpSpecialSummonStep
            ? []
          : summonStatus && !isNormalSummonStep
              ? [summonStatus]
              : []),
        ...selfSummonTransferredStatuses,
        ...(isSelfSpecialSummonSetupStep
          || isNormalSummonAddToHandStep
          || isSpecialSummonAddToHandStep
          || isTargetIntoFollowUpSpecialSummonStep
          || isGenericPrimaryIntoFollowUpSpecialSummonStep
          ? []
          : nonSummonStatusEffects.filter(
            (type) =>
              type !== 'send-gy' &&
              !(isActivateBanishStep && type === 'banish') &&
              !(isBanishMaterialSummonStep && type === 'banish'),
          )),
      ])
    : [];
  const simpleTwoCardSourceStatuses = isNormalSummonStep
    ? ['normal-summon' as const, ...sourceStatuses.filter((status) => status !== 'normal-summon')]
    : sourceStatuses;
  const displayedTargetZone =
    (isSpecialIntoSendGyStep && !isTargetIntoFollowUpSpecialSummonStep) || isNormalIntoSendGyStep || isNormalSummonAddToHandStep || isActivateSelfSummonStep || isActivateSelfSetStep
      ? undefined
      : action.targetZone;
  const targetDisplayZones = targetCards.map((_, index) =>
    targetZones[index],
  );
  const shouldShowTargetOriginBadge =
    (labelsToRender.includes('Add to Hand') || labelsToRender.includes('Search')) &&
    Boolean(action.targetOriginZone);
  const targetZoneBadgePrefix = labelsToRender.includes('Return') ? 'To' : 'From';
  const secondaryEffectTypes = cardEffects.filter((type) => type !== 'activate');
  const genericChainMiddleEffectType = cardEffects[1];
  const addPrimaryEffectType = secondaryEffectTypes.find((type) => type !== 'search');
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
          type !== 'field-spell' &&
          type !== 'summon' &&
          !isSelfSpecialSummonSetupStep,
      )
    : isLeadingEffectMaterialSummonStep
      ? []
      : isSimpleGenericAddStep
        ? ['search']
      : centerStatuses;
  const cardRef = useRef<HTMLDivElement>(null);
  const commentButtonRef = useRef<HTMLButtonElement>(null);
  const commentEditorRef = useRef<HTMLDivElement>(null);
  const commentPreviewRef = useRef<HTMLDivElement>(null);
  const targetMarker = (
    <div className={`rounded-full border bg-secondary/90 p-1.5 ${EFFECT_STYLES.target.border}`}>
      <LocateFixed className={`h-4 w-4 ${EFFECT_STYLES.target.text}`} strokeWidth={2.4} />
    </div>
  );
  const TaggedCardDisplay = useCallback((props: React.ComponentProps<typeof CardDisplay>) => (
    <CardDisplay
      {...props}
      customTag={props.customTag ?? getCustomCardTag(action.raw, props.name)}
    />
  ), [action.raw]);
  const scaleTargetCardsBySide: Partial<Record<ScaleSide, { name: string; zone?: ComboAction['targetZone'] }>> = isActivateScaleStep
    ? targetCards.reduce<Partial<Record<ScaleSide, { name: string; zone?: ComboAction['targetZone'] }>>>((acc, cardName, index) => {
        const side = scaleSides[index];
        if (!side) return acc;
        acc[side] = { name: cardName, zone: targetZones[index] };
        return acc;
      }, {})
    : {};
  const singleScaleSide = isScaleStep && sourceCards.length === 1 ? scaleSides[0] : undefined;
  const singleScaleOverlay = singleScaleSide === 'left'
    ? <ScaleLeftOverlayIcon className="h-12 w-12" />
    : <ScaleRightOverlayIcon className="h-12 w-12" />;
  const topCascadeIndex = activeCascadeIndex ?? sourceCards.length - 1;
  const activeCascadeZone = shouldUseCascadeStack ? sourceZones[topCascadeIndex] : undefined;
  const topTargetCascadeIndex = activeTargetCascadeIndex ?? targetCards.length - 1;
  const activeTargetZone = shouldUseTargetCascadeStack ? targetDisplayZones[topTargetCascadeIndex] : undefined;
  const followUpStatuses = (
    isTargetIntoFollowUpSpecialSummonStep
      ? [
          'special-summon' as const,
        ]
      : []
  );
  const chainedPrimaryEffectType = secondaryEffectTypes.find((type) => type !== 'summon');
  const genericPrimaryEffectType = secondaryEffectTypes[0];
  const genericFollowUpEffectType = secondaryEffectTypes[1];
  const chainedTargetStatuses = (
    isTargetIntoFollowUpSpecialSummonStep && chainedPrimaryEffectType && TARGET_ONLY_STATUS_EFFECTS.has(chainedPrimaryEffectType)
      ? chainedPrimaryEffectType === 'send-gy' && action.targetOriginZone
        ? []
        : [chainedPrimaryEffectType]
      : []
  );
  const CASCADE_EXTRA_FOOTPRINT = 1;
  const sourceCascadeShift = shouldUseCascadeStack ? Math.max(0, sourceCards.length - 2) * 18 : 0;
  const sourceCascadeWrapperStyle = shouldUseCascadeStack
    ? { marginLeft: `${12 + CASCADE_EXTRA_FOOTPRINT}px` }
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
  const shouldBalanceLeadingIconColumn = isMultiMaterialSummon || isLeadingEffectMaterialSummonStep;
  const sharedCardDisplayProps = { size: cardSize };

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
    setLinkDrafts((current) => {
      const nextDrafts: Record<string, string> = {};
      for (const link of links) {
        nextDrafts[link.id] = current[link.id] ?? link.label;
      }
      return nextDrafts;
    });
  }, [links]);

  useEffect(() => () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (linkDragFrameRef.current !== null) {
      window.cancelAnimationFrame(linkDragFrameRef.current);
    }
  }, []);

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
    if (!isCommentEditorOpen || !commentEditorRef.current) return;

    const editor = commentEditorRef.current;
    const updateHeight = () => setCommentEditorHeight(editor.getBoundingClientRect().height);
    updateHeight();

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(editor);
    return () => resizeObserver.disconnect();
  }, [comment?.width, draftComment, isCommentEditorOpen]);

  useEffect(() => {
    if (!isCommentHovered || isCommentEditorOpen || !commentPreviewRef.current || !comment?.text.trim()) return;

    const preview = commentPreviewRef.current;
    const updateHeight = () => setCommentPreviewHeight(preview.getBoundingClientRect().height);
    updateHeight();

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(preview);
    return () => resizeObserver.disconnect();
  }, [comment?.text, comment?.width, isCommentEditorOpen, isCommentHovered]);

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

  const clampLinkPosition = useCallback((link: StepLink, x: number, y: number) => {
    const container = cardRef.current;
    if (!container) return { x, y };

    const maxX = Math.max(0, container.clientWidth - link.width - 12);
    const maxY = Math.max(0, container.clientHeight - 42 - 12);

    return {
      x: Math.max(12, Math.min(x, maxX)),
      y: Math.max(60, Math.min(y, maxY)),
    };
  }, []);

  const clampLinkWidth = useCallback((link: StepLink, width: number) => {
    const container = cardRef.current;
    const maxWidth = container
      ? Math.min(MAX_LINK_WIDTH, Math.max(MIN_LINK_WIDTH, container.clientWidth - link.x - 12))
      : MAX_LINK_WIDTH;

    return Math.round(Math.max(MIN_LINK_WIDTH, Math.min(width, maxWidth)));
  }, []);

  const getCommentPanelPosition = useCallback((panelWidth: number, panelHeight: number) => {
    const container = cardRef.current;
    const button = commentButtonRef.current;

    if (!container || !comment) {
      return { left: 0, top: 0 };
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button?.getBoundingClientRect();
    const buttonWidth = buttonRect?.width ?? 44;
    const buttonHeight = buttonRect?.height ?? 44;
    const gap = 12;
    const padding = 12;
    const maxLeft = Math.max(padding, containerRect.width - panelWidth - padding);
    const maxTop = Math.max(padding, containerRect.height - panelHeight - padding);
    const preferredRight = comment.x + buttonWidth + gap;
    const preferredLeft = comment.x - panelWidth - gap;
    const centeredTop = comment.y + (buttonHeight - panelHeight) / 2;

    const nextLeft = preferredRight <= maxLeft ? preferredRight : preferredLeft;

    return {
      left: Math.max(padding, Math.min(nextLeft, maxLeft)),
      top: Math.max(padding, Math.min(centeredTop, maxTop)),
    };
  }, [comment]);

  const commentPreviewPosition = getCommentPanelPosition(comment?.width ?? 260, commentPreviewHeight);
  const commentEditorPosition = getCommentPanelPosition(comment?.width ?? 260, commentEditorHeight);
  const renderedCommentPosition = dragCommentPosition ?? (comment ? { x: comment.x, y: comment.y } : null);

  const handleCommentPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!comment) return;

    const buttonRect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - buttonRect.left,
      y: event.clientY - buttonRect.top,
    };

    pendingDragPositionRef.current = { x: comment.x, y: comment.y };
    setDragCommentPosition({ x: comment.x, y: comment.y });
    didDragCommentRef.current = false;
    setIsDraggingComment(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [comment]);

  const handleCommentPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingComment || !comment) return;

    const container = cardRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const nextX = event.clientX - containerRect.left - dragOffsetRef.current.x;
    const nextY = event.clientY - containerRect.top - dragOffsetRef.current.y;
    const clamped = clampCommentPosition(nextX, nextY);
    pendingDragPositionRef.current = clamped;
    didDragCommentRef.current = true;

    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      if (pendingDragPositionRef.current) {
        setDragCommentPosition(pendingDragPositionRef.current);
      }
    });
  }, [clampCommentPosition, comment, isDraggingComment]);

  const handleCommentPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingComment) return;
    setIsDraggingComment(false);
    setDragCommentPosition(null);
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (pendingDragPositionRef.current && didDragCommentRef.current) {
      onCommentPositionChange?.(pendingDragPositionRef.current.x, pendingDragPositionRef.current.y);
    }
    pendingDragPositionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [isDraggingComment, onCommentPositionChange]);

  const handleSaveComment = useCallback(() => {
    onCommentChange?.(draftComment);
    onCloseCommentEditor?.();
  }, [draftComment, onCloseCommentEditor, onCommentChange]);

  const handleLinkPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, link: StepLink) => {
    setActiveLinkId(link.id);
    if ((event.target as HTMLElement | null)?.closest('input, button, [data-link-resize-handle="true"]')) return;
    const containerRect = cardRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setDragLinkId(link.id);
    didDragLinkRef.current = false;
    linkDragOffsetRef.current = {
      x: event.clientX - containerRect.left - link.x,
      y: event.clientY - containerRect.top - link.y,
    };
    pendingLinkDragRef.current = { id: link.id, x: link.x, y: link.y };
    setDragLinkPositions((current) => ({ ...current, [link.id]: { x: link.x, y: link.y } }));
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleLinkPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>, link: StepLink) => {
    if (dragLinkId !== link.id) return;
    const containerRect = cardRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const nextX = event.clientX - containerRect.left - linkDragOffsetRef.current.x;
    const nextY = event.clientY - containerRect.top - linkDragOffsetRef.current.y;
    const nextPosition = clampLinkPosition(link, nextX, nextY);
    pendingLinkDragRef.current = { id: link.id, ...nextPosition };
    didDragLinkRef.current = true;

    if (linkDragFrameRef.current !== null) return;
    linkDragFrameRef.current = window.requestAnimationFrame(() => {
      linkDragFrameRef.current = null;
      const pending = pendingLinkDragRef.current;
      if (!pending) return;
      setDragLinkPositions((current) => ({
        ...current,
        [pending.id]: { x: pending.x, y: pending.y },
      }));
    });
  }, [clampLinkPosition, dragLinkId]);

  const handleLinkPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>, link: StepLink) => {
    if (dragLinkId !== link.id) return;
    setDragLinkId(null);
    setDragLinkPositions((current) => {
      const next = { ...current };
      delete next[link.id];
      return next;
    });
    if (linkDragFrameRef.current !== null) {
      window.cancelAnimationFrame(linkDragFrameRef.current);
      linkDragFrameRef.current = null;
    }
    if (pendingLinkDragRef.current && didDragLinkRef.current) {
      onLinkPositionChange?.(link.id, pendingLinkDragRef.current.x, pendingLinkDragRef.current.y);
    }
    pendingLinkDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [dragLinkId, onLinkPositionChange]);

  const handleLinkResizePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, link: StepLink) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveLinkId(link.id);
    setResizeLinkId(link.id);
    linkResizeStartRef.current = { clientX: event.clientX, width: link.width };
    pendingLinkWidthRef.current = { id: link.id, width: link.width };
    setDragLinkWidths((current) => ({ ...current, [link.id]: link.width }));
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleLinkResizePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>, link: StepLink) => {
    if (resizeLinkId !== link.id) return;

    const deltaX = event.clientX - linkResizeStartRef.current.clientX;
    const nextWidth = clampLinkWidth(link, linkResizeStartRef.current.width + deltaX);
    pendingLinkWidthRef.current = { id: link.id, width: nextWidth };

    if (linkResizeFrameRef.current !== null) return;
    linkResizeFrameRef.current = window.requestAnimationFrame(() => {
      linkResizeFrameRef.current = null;
      const pending = pendingLinkWidthRef.current;
      if (!pending) return;
      setDragLinkWidths((current) => ({ ...current, [pending.id]: pending.width }));
    });
  }, [clampLinkWidth, resizeLinkId]);

  const handleLinkResizePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>, link: StepLink) => {
    if (resizeLinkId !== link.id) return;
    setResizeLinkId(null);
    setDragLinkWidths((current) => {
      const next = { ...current };
      delete next[link.id];
      return next;
    });
    if (linkResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(linkResizeFrameRef.current);
      linkResizeFrameRef.current = null;
    }
    if (pendingLinkWidthRef.current) {
      onLinkWidthChange?.(link.id, pendingLinkWidthRef.current.width);
    }
    pendingLinkWidthRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [onLinkWidthChange, resizeLinkId]);

  const saveLinkLabel = useCallback((link: StepLink) => {
    const nextLabel = linkDrafts[link.id]?.trim() || 'Combo Link';
    onLinkLabelChange?.(link.id, nextLabel);
    setEditingLinkId(null);
  }, [linkDrafts, onLinkLabelChange]);

  useEffect(() => {
    const clearActiveLink = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('[data-combo-link-badge="true"]')) return;
      setActiveLinkId(null);
    };

    document.addEventListener('pointerdown', clearActiveLink);
    return () => document.removeEventListener('pointerdown', clearActiveLink);
  }, []);

  const commentIcon = React.createElement('lord-icon', {
    src: 'https://cdn.lordicon.com/wwsllqpi.json',
    trigger: 'click',
    colors: 'primary:#6ee7b7',
    style: { width: '28px', height: '28px' },
  });

  return (
    <CardDisplaySizeProvider size={cardSize}>
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
              if (!didDragCommentRef.current) {
                onOpenCommentEditor?.();
              }
              didDragCommentRef.current = false;
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
            style={{
              transform: renderedCommentPosition
                ? `translate3d(${renderedCommentPosition.x}px, ${renderedCommentPosition.y}px, 0)`
                : undefined,
              left: 0,
              top: 0,
              willChange: isDraggingComment ? 'transform' : undefined,
            }}
            aria-label="Open step comment"
          >
            {commentIcon}
          </button>
          {!isCommentEditorOpen && isCommentHovered && comment.text.trim().length > 0 && (
            <div
              ref={commentPreviewRef}
              className="pointer-events-none absolute z-20 max-w-[520px] rounded-2xl border border-white/10 bg-background/30 p-3 shadow-2xl backdrop-blur-md"
              style={{
                left: `${commentPreviewPosition.left}px`,
                top: `${commentPreviewPosition.top}px`,
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
                left: `${commentEditorPosition.left}px`,
                top: `${commentEditorPosition.top}px`,
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
                    onClick={onCommentDelete}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    aria-label="Delete step comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
      {links.map((link) => {
        const renderedLinkPosition = dragLinkPositions[link.id] ?? { x: link.x, y: link.y };
        const renderedLinkWidth = dragLinkWidths[link.id] ?? link.width;
        const isEditingLink = editingLinkId === link.id;
        const isActiveLink = activeLinkId === link.id;

        return (
          <div
            key={link.id}
            data-combo-link-badge="true"
            onPointerDown={(event) => handleLinkPointerDown(event, link)}
            onPointerMove={(event) => handleLinkPointerMove(event, link)}
            onPointerUp={(event) => handleLinkPointerUp(event, link)}
            onPointerCancel={(event) => handleLinkPointerUp(event, link)}
            className={cn(
              'absolute z-20 flex min-h-10 items-center gap-2 rounded-full border bg-secondary/80 px-2 py-1 shadow-lg backdrop-blur-sm transition-transform',
              LINK_BG_CLASS,
              LINK_BORDER_CLASS,
              dragLinkId === link.id ? 'cursor-grabbing scale-105' : resizeLinkId === link.id ? 'cursor-ew-resize scale-105' : 'cursor-grab hover:scale-105',
            )}
            style={{
              transform: `translate3d(${renderedLinkPosition.x}px, ${renderedLinkPosition.y}px, 0)`,
              left: 0,
              top: 0,
              width: `${renderedLinkWidth}px`,
              willChange: dragLinkId === link.id || resizeLinkId === link.id ? 'transform, width' : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => onOpenLink?.(link)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${LINK_TEXT_CLASS} ${LINK_BG_CLASS} ${LINK_BORDER_CLASS}`}
              aria-label="Open linked combo step"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
            {isEditingLink ? (
              <input
                value={linkDrafts[link.id] ?? link.label}
                onChange={(event) => setLinkDrafts((current) => ({ ...current, [link.id]: event.target.value }))}
                onBlur={() => saveLinkLabel(link)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveLinkLabel(link);
                  }
                  if (event.key === 'Escape') {
                    setLinkDrafts((current) => ({ ...current, [link.id]: link.label }));
                    setEditingLinkId(null);
                  }
                }}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-xs font-display font-semibold text-foreground outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (didDragLinkRef.current) {
                    didDragLinkRef.current = false;
                    return;
                  }
                  setEditingLinkId(link.id);
                }}
                className="min-w-0 flex-1 truncate text-left text-xs font-display font-semibold text-foreground"
                title={link.label}
              >
                {link.label}
              </button>
            )}
            <button
              type="button"
              data-link-resize-handle="true"
              onPointerDown={(event) => handleLinkResizePointerDown(event, link)}
              onPointerMove={(event) => handleLinkResizePointerMove(event, link)}
              onPointerUp={(event) => handleLinkResizePointerUp(event, link)}
              onPointerCancel={(event) => handleLinkResizePointerUp(event, link)}
              className={cn(
                'flex h-7 w-3 shrink-0 cursor-ew-resize items-center justify-center rounded-full text-cyan-100/70 transition-all hover:text-cyan-100',
                isActiveLink ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-label="Resize combo link"
              aria-hidden={!isActiveLink}
              tabIndex={isActiveLink ? 0 : -1}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onLinkDelete?.(link.id)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive transition-all hover:bg-destructive/20',
                isActiveLink ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-label="Delete combo link"
              aria-hidden={!isActiveLink}
              tabIndex={isActiveLink ? 0 : -1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <div className="edge-light" />
      <div className="border-glow-inner p-6 gap-4">
        {/* Step label */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display font-bold text-sm text-white bg-sky-300/10 px-3 py-1 rounded-full border border-sky-300/30">
            Step {stepLabel ?? stepNumber}
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
          {customStepTags.map((tag) => (
            <span
              key={`custom-step-tag-${tag}`}
              className="rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-300/20 to-fuchsia-300/20 px-3 py-1 font-display text-sm font-semibold text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.16)]"
            >
              <span className="bg-gradient-to-r from-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
                {tag}
              </span>
            </span>
          ))}
        </div>

        {/* Visual */}
        <div className="flex items-start justify-center gap-2 flex-wrap">
          {action.targetOnly && action.targetCard && (
            <>
              {(action.type === 'pendulum' || action.type === 'set') && (
                <div className="flex items-center self-start" style={visualColumnStyle} aria-label={`${action.label} symbol`}>
                  <ActionIcon type={action.type} />
                </div>
              )}
              {targetCards.length > 1 ? (
                <div className="flex flex-wrap items-start justify-center gap-3">
                  {targetCards.map((cardName, index) => (
                    <TaggedCardDisplay
                      {...sharedCardDisplayProps}
                      key={`${cardName}-${index}`}
                      name={cardName}
                      actionType={action.type}
                      useStarBorder
                      zone={targetZones[index]}
                      statuses={action.type === 'continuous' ? ['continuous'] : action.type === 'field-spell' ? ['field-spell'] : action.type === 'summon' && labelsToRender.includes('Special Summon') ? ['special-summon'] : []}
                      topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                    />
                  ))}
                </div>
              ) : (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={action.targetCard}
                  actionType={action.type}
                  useStarBorder
                  zone={action.targetZone}
                  statuses={action.type === 'continuous' ? ['continuous'] : action.type === 'field-spell' ? ['field-spell'] : action.type === 'summon' && labelsToRender.includes('Special Summon') ? ['special-summon'] : []}
                  topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                />
              )}
            </>
          )}

          {!action.targetOnly && isScaleActivateTargetStep && action.targetCard && scaleActivateEffectType && (
            <>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={sourceCards[0]}
                actionType={action.type}
                useStarBorder
                zone={sourceZones[0]}
                centerOverlay={singleScaleOverlay}
                isActivated={sourceHasActivation}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={scaleActivateEffectType} />
                </div>
                <ActionArrow type={scaleActivateEffectType} />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType={scaleActivateEffectType}
                zone={action.targetZone}
                statuses={scaleActivateEffectType === 'summon' ? ['special-summon'] : []}
              />
            </>
          )}

          {!action.targetOnly && isScaleStep && !isScaleActivateTargetStep && sourceCards.length === 1 && (
            <div className="flex w-full justify-center">
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={sourceCards[0]}
                actionType={action.type}
                useStarBorder
                zone={sourceZones[0]}
                centerOverlay={singleScaleOverlay}
              />
            </div>
          )}

          {!action.targetOnly && isScaleStep && !isScaleActivateTargetStep && sourceCards.length > 1 && (
            <div className="flex flex-wrap items-start justify-center gap-3">
              {sourceCards.map((cardName, index) => {
                const side = scaleSides[index];
                const centerOverlay = side === 'left'
                  ? <ScaleLeftOverlayIcon className="h-12 w-12" />
                  : <ScaleRightOverlayIcon className="h-12 w-12" />;

                return (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    key={`${cardName}-${index}`}
                    name={cardName}
                    actionType={action.type}
                    useStarBorder
                    zone={sourceZones[index]}
                    centerOverlay={centerOverlay}
                  />
                );
              })}
            </div>
          )}

          {!action.targetOnly && !isScaleStep && isActivateScaleStep && (
            <>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
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
                  <ActionIcon type="scale" />
                </div>
                <ActionArrow type="scale" />
              </div>
              <div className="flex flex-wrap items-start justify-center gap-3">
                {scaleTargetCardsBySide.left && (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    name={scaleTargetCardsBySide.left.name}
                    actionType="scale"
                    useStarBorder
                    zone={scaleTargetCardsBySide.left.zone}
                    centerOverlay={<ScaleLeftOverlayIcon className="h-12 w-12" />}
                  />
                )}
                {scaleTargetCardsBySide.right && (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    name={scaleTargetCardsBySide.right.name}
                    actionType="scale"
                    useStarBorder
                    zone={scaleTargetCardsBySide.right.zone}
                    centerOverlay={<ScaleRightOverlayIcon className="h-12 w-12" />}
                  />
                )}
              </div>
            </>
          )}

          {!action.targetOnly && !isScaleStep && isActivateFusionStep && action.targetCard && (
            <>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.sourceCard}
                actionType={action.type}
                useStarBorder
                zone={action.sourceZone}
                leftEffectTypes={[]}
                statuses={simpleTwoCardSourceStatuses}
                isActivated={sourceHasActivation}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="fusion" />
                </div>
                <ActionArrow type="fusion" />
              </div>
              {shouldUseCascadeStack ? (
                <div className="relative flex items-center justify-center" style={{ ...cascadeBoxStyle, ...sourceCascadeWrapperStyle }}>
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
                          <TaggedCardDisplay
                            {...sharedCardDisplayProps}
                            name={cardName}
                            actionType="fusion"
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
                      <div className="flex items-center self-start" style={visualColumnStyle}>
                        <MaterialPlusIcon className={`h-13 w-13 ${materialConnectorColor}`} />
                      </div>
                    )}
                    <TaggedCardDisplay
                      {...sharedCardDisplayProps}
                      name={cardName}
                      actionType="fusion"
                      useStarBorder={false}
                      zone={sourceZones[index]}
                    />
                  </div>
                ))
              )}
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...sourceCascadeRightStyle }}>
                <ActionArrow type="fusion" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="fusion"
                zone={action.targetZone}
                statuses={['fusion']}
              />
            </>
          )}

          {!action.targetOnly && !isScaleStep && isActivateSimpleTwoCardStep && action.targetCard && (
            <>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.sourceCard}
                actionType={action.type}
                useStarBorder
                zone={action.sourceZone}
                leftEffectTypes={[]}
                statuses={simpleTwoCardSourceStatuses}
                isActivated={sourceHasActivation}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  {secondaryEffectTypes.map((type, index) => (
                    <ActionIcon key={`${type}-${index}`} type={type} />
                  ))}
                </div>
                <ActionArrow type={arrowEffectType} />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType={arrowEffectType}
                zone={displayedTargetZone}
                originZone={arrowEffectType === 'send-gy' || arrowEffectType === 'return' ? action.targetOriginZone : undefined}
                statuses={targetStatuses}
                topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
              />
            </>
          )}

          {!action.targetOnly && !isScaleStep && !isActivateScaleStep && !isActivateFusionStep && !isActivateSimpleTwoCardStep && (
            <>
          {isMultiMaterialSummon && (
            <div className="flex flex-col items-center justify-center gap-3 self-start" style={iconColumnStyle}>
              <ActionIcon type={action.type} />
              {shouldUseCascadeStack && (
                <div style={{ width: `${iconColumnWidth}px` }}>
                  <SourceZoneBadge zone={activeCascadeZone} className="justify-center" />
                </div>
              )}
            </div>
          )}

          {isLeadingEffectMaterialSummonStep && (
            <div
              className="flex flex-col items-center justify-center gap-3 self-start"
              style={iconColumnStyle}
              aria-label="Leading material effect icons"
            >
              {secondaryEffectTypes
                .filter((type) => type !== 'summon')
                .map((type, index) => (
                  <ActionIcon key={`${type}-${index}`} type={type} />
                ))}
              {shouldUseCascadeStack && (
                <div style={{ width: `${iconColumnWidth}px` }}>
                  <SourceZoneBadge zone={activeCascadeZone} className="justify-center" />
                </div>
              )}
            </div>
          )}

          {shouldUseCascadeStack ? (
            <div className="relative flex items-center justify-center" style={{ ...cascadeBoxStyle, ...sourceCascadeWrapperStyle }}>
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
                      <TaggedCardDisplay
                        {...sharedCardDisplayProps}
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
                  <div className="flex items-center self-start" style={visualColumnStyle}>
                    <MaterialPlusIcon className={`h-13 w-13 ${materialConnectorColor}`} />
                  </div>
                )}
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={cardName}
                  actionType={action.type}
                  useStarBorder={action.type !== 'fusion'}
                  zone={sourceZones[index]}
                  leftEffectTypes={index === 0 && !isLeadingEffectMaterialSummonStep ? sourceEffects : []}
                  statuses={index === 0 ? sourceStatuses : []}
                  isActivated={index === 0 && sourceHasActivation && !isActivateFusionStep}
                />
              </div>
            ))
          )}

          {isSelfReturnIntoFollowUpSpecialSummonStep && action.followUpCard && (
            <>
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...sourceCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
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
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
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
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
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
                  <ActionIcon type={isActivateDiscardBeforeAddStep ? 'discard' : 'search'} />
                </div>
                <ActionArrow type={isActivateDiscardBeforeAddStep ? 'discard' : 'search'} />
                {!isActivateDiscardBeforeAddStep && shouldShowTargetOriginBadge && (
                  <SourceZoneBadge zone={action.targetOriginZone} className="min-w-[88px] justify-center" />
                )}
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType={isActivateDiscardBeforeAddStep ? 'discard' : 'search'}
                zone={action.targetZone}
                statuses={isActivateDiscardBeforeAddStep ? ['discard'] : []}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={isActivateDiscardBeforeAddStep ? 'search' : 'discard'} />
                </div>
                <ActionArrow type={isActivateDiscardBeforeAddStep ? 'search' : 'discard'} />
                {isActivateDiscardBeforeAddStep && shouldShowTargetOriginBadge && (
                  <SourceZoneBadge zone={action.targetOriginZone} className="min-w-[88px] justify-center" />
                )}
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType={isActivateDiscardBeforeAddStep ? 'search' : 'discard'}
                zone={action.followUpZone}
                statuses={isActivateDiscardBeforeAddStep ? [] : ['discard']}
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
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
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
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isActivateBanishReturnStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="banish" />
                </div>
                <ActionArrow type="banish" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="banish"
                zone={action.targetZone}
                statuses={[]}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="return" />
                </div>
                <ActionArrow type="return" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="return"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isActivateTributeAddStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="tribute" />
                </div>
                <ActionArrow type="tribute" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="tribute"
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
              <TaggedCardDisplay
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isActivateSendAddStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="send-gy" />
                </div>
                <ActionArrow type="send-gy" />
              </div>
              <TaggedCardDisplay
                name={action.targetCard}
                actionType="send-gy"
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
              <TaggedCardDisplay
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isActivateGenericPrimaryAddStep && action.targetCard && addPrimaryEffectType && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={addPrimaryEffectType} />
                </div>
                <ActionArrow type={addPrimaryEffectType} />
              </div>
              <TaggedCardDisplay
                name={action.targetCard}
                actionType={addPrimaryEffectType}
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
              {followUpCards.length > 1 ? (
                <div className="flex flex-wrap items-start justify-center gap-3">
                  {followUpCards.map((cardName, index) => (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    key={`${cardName}-${index}`}
                      name={cardName}
                      actionType="search"
                      zone={followUpZones[index]}
                      statuses={[]}
                    />
                  ))}
                </div>
              ) : action.followUpCard ? (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={action.followUpCard}
                  actionType="search"
                  zone={action.followUpZone}
                  statuses={[]}
                />
              ) : null}
            </>
          )}

          {isGenericPrimaryAddStep && action.targetCard && genericChainMiddleEffectType && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={genericChainMiddleEffectType} />
                </div>
                <ActionArrow type={genericChainMiddleEffectType} />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType={genericChainMiddleEffectType}
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
              {followUpCards.length > 1 ? (
                <div className="flex flex-wrap items-start justify-center gap-3">
                  {followUpCards.map((cardName, index) => (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    key={`${cardName}-${index}`}
                      name={cardName}
                      actionType="search"
                      zone={followUpZones[index]}
                      statuses={[]}
                    />
                  ))}
                </div>
              ) : action.followUpCard ? (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={action.followUpCard}
                  actionType="search"
                  zone={action.followUpZone}
                  statuses={[]}
                />
              ) : null}
            </>
          )}

          {isGenericPrimarySummonAddStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...sourceCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="summon"
                zone={action.targetZone}
                statuses={['special-summon']}
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
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isActivateSummonAddStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...sourceCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="summon"
                zone={action.targetZone}
                statuses={['special-summon']}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="search" />
                </div>
                <ActionArrow type="search" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="search"
                zone={action.followUpZone}
                statuses={[]}
              />
            </>
          )}

          {isGenericPrimaryIntoFollowUpSpecialSummonStep && action.targetCard && action.followUpCard && genericChainMiddleEffectType && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={genericChainMiddleEffectType} />
                </div>
                <ActionArrow type={genericChainMiddleEffectType} />
                {shouldUseTargetCascadeStack && displayedTargetZone && (
                  <SourceZoneBadge zone={activeTargetZone} prefix={targetZoneBadgePrefix} className="min-w-[88px] justify-center" />
                )}
              </div>
              {targetCards.length > 1 ? (
                <div className="flex flex-wrap items-start gap-3">
                  {targetCards.map((cardName, index) => (
                  <TaggedCardDisplay
                    {...sharedCardDisplayProps}
                    key={`${cardName}-${index}`}
                      name={cardName}
                      actionType={genericChainMiddleEffectType}
                      zone={displayedTargetZone ? targetDisplayZones[index] : undefined}
                      statuses={[]}
                    />
                  ))}
                </div>
              ) : (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={action.targetCard}
                  actionType={genericChainMiddleEffectType}
                  zone={action.targetZone}
                  statuses={[]}
                />
              )}
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...targetCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="summon"
                zone={action.followUpZone}
                statuses={['special-summon']}
              />
            </>
          )}

          {isActivateSummonDestroyStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...sourceCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="summon"
                zone={action.targetZone}
                statuses={['special-summon']}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="destroy" />
                </div>
                <ActionArrow type="destroy" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="destroy"
                zone={action.followUpZone}
                statuses={['destroy']}
              />
            </>
          )}

          {isActivateDestroySummonStep && action.targetCard && action.followUpCard && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type="destroy" />
                </div>
                <ActionArrow type="destroy" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType="destroy"
                zone={action.targetZone}
                statuses={['destroy']}
              />
              <div className="flex items-center self-start" style={arrowColumnStyle}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="summon"
                zone={action.followUpZone}
                statuses={['special-summon']}
              />
            </>
          )}

          {isActivateGenericFollowUpStep && action.targetCard && action.followUpCard && genericPrimaryEffectType && genericFollowUpEffectType && (
            <>
              <div className="flex flex-col items-center gap-2 self-center" style={sourceCascadeRightStyle}>
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={genericPrimaryEffectType} />
                </div>
                <ActionArrow type={genericPrimaryEffectType} />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.targetCard}
                actionType={genericPrimaryEffectType}
                zone={action.targetZone}
                statuses={[genericPrimaryEffectType]}
              />
              <div className="flex flex-col items-center gap-2 self-center">
                <div className="flex min-h-8 items-center justify-center gap-2">
                  <ActionIcon type={genericFollowUpEffectType} />
                </div>
                <ActionArrow type={genericFollowUpEffectType} />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType={genericFollowUpEffectType}
                zone={action.followUpZone}
                statuses={[genericFollowUpEffectType]}
              />
            </>
          )}

          {isTargetIntoFollowUpSpecialSummonStep && !isActivateSummonDestroyStep && !isActivateDestroySummonStep && !isActivateAddThenDiscardStep && !isActivateBanishAddStep && !isSelfReturnIntoFollowUpSpecialSummonStep && action.targetCard && action.followUpCard && chainedPrimaryEffectType && (
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
                <div className="relative flex items-center justify-center" style={{ ...cascadeBoxStyle, ...targetCascadeWrapperStyle }}>
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
                          <TaggedCardDisplay
                            {...sharedCardDisplayProps}
                            name={cardName}
                            actionType={action.type}
                            zone={displayedTargetZone ? targetDisplayZones[index] : undefined}
                            statuses={chainedTargetStatuses}
                            compact
                            showZoneBadge={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={action.targetCard}
                  actionType={action.type}
                  zone={displayedTargetZone}
                  statuses={chainedTargetStatuses}
                />
              )}
              <div className="flex items-center self-start" style={{ ...arrowColumnStyle, ...targetCascadeRightStyle }}>
                <ActionArrow type="summon" />
              </div>
              <TaggedCardDisplay
                {...sharedCardDisplayProps}
                name={action.followUpCard}
                actionType="summon"
                zone={action.followUpZone}
                statuses={[...followUpStatuses]}
              />
            </>
          )}

          {!isActivateScaleStep && !isActivateRevealAddStep && !isActivateAddThenDiscardStep && !isActivateBanishAddStep && !isActivateBanishReturnStep && !isActivateTributeAddStep && !isActivateSendAddStep && !isActivateGenericPrimaryAddStep && !isGenericPrimaryAddStep && !isGenericPrimarySummonAddStep && !isActivateSummonAddStep && !isActivateSummonDestroyStep && !isActivateDestroySummonStep && !isActivateGenericFollowUpStep && !isTargetIntoFollowUpSpecialSummonStep && !isGenericPrimaryIntoFollowUpSpecialSummonStep && !isActivateFusionStep && targetCards.length > 0 && (
            <>
              <div
                className={
                  centerIcons.length > 0
                    ? 'flex flex-col items-center gap-2 self-center'
                    : 'flex items-center self-start'
                }
                style={centerIcons.length > 0 ? sourceCascadeRightStyle : { ...arrowColumnStyle, ...sourceCascadeRightStyle }}
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
                <div className="relative flex items-center justify-center" style={{ ...cascadeBoxStyle, ...targetCascadeWrapperStyle }}>
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
                          <TaggedCardDisplay
                            {...sharedCardDisplayProps}
                            name={cardName}
                            actionType={action.type}
                            zone={displayedTargetZone ? targetDisplayZones[index] : undefined}
                            originZone={shouldAttachTargetOriginZone ? action.targetOriginZone : undefined}
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
                    <TaggedCardDisplay
                      {...sharedCardDisplayProps}
                      key={`${cardName}-${index}`}
                      name={cardName}
                      actionType={action.type}
                      zone={displayedTargetZone ? targetDisplayZones[index] : undefined}
                      originZone={shouldAttachTargetOriginZone ? action.targetOriginZone : undefined}
                      statuses={targetStatuses}
                      topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                    />
                  ))}
                </div>
              ) : (
                <TaggedCardDisplay
                  {...sharedCardDisplayProps}
                  name={targetCards[0]}
                  actionType={action.type}
                  zone={displayedTargetZone}
                  originZone={shouldAttachTargetOriginZone ? action.targetOriginZone : undefined}
                  statuses={targetStatuses}
                  topLeftOverlay={usesTargetEffect ? targetMarker : undefined}
                />
              )}
            </>
          )}

          {targetCards.length === 0 && null}

          {shouldBalanceLeadingIconColumn && (
            <div className="shrink-0 self-start" style={iconColumnStyle} aria-hidden="true" />
          )}
            </>
          )}
        </div>
      </div>
      </div>
    </CardDisplaySizeProvider>
  );
}
