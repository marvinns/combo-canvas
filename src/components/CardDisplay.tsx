import { getCardHudAnchor, type CardHudAnchor } from '@/lib/cardHud';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCardImage, useRelatedCards } from '@/hooks/useCardImage';
import type { CardZone, ComboAction, ScaleSide } from '@/lib/comboParser';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { Info, LayersPlus, Plus, Skull } from 'lucide-react';
import { EFFECT_STYLES, EffectGlyph } from './ActionIcon';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export type CardStatus = ComboAction['type'] | 'special-summon' | 'normal-summon';
export type CardDisplaySize = 'default' | 'desktop-full';
export type CardNoteMap = Record<string, string>;
const CardDisplaySizeContext = createContext<CardDisplaySize>('default');
const CARD_CYCLE_INTERVAL_MS = 2000;

function getSlotCardNames(name: string): string[] {
  const cardNames = name.split('|').map((cardName) => cardName.trim()).filter(Boolean);
  return cardNames.length > 1 ? cardNames : [name];
}

export function CardDisplaySizeProvider({
  size,
  children,
}: {
  size: CardDisplaySize;
  children: ReactNode;
}) {
  return (
    <CardDisplaySizeContext.Provider value={size}>
      {children}
    </CardDisplaySizeContext.Provider>
  );
}

function getCardDimensions(size: CardDisplaySize) {
  return size === 'desktop-full'
    ? {
        width: 176,
        height: 257,
        leftRailMinHeight: 257,
        leftRailWidth: 48,
      }
    : {
        width: 140,
        height: 204,
        leftRailMinHeight: 204,
        leftRailWidth: 40,
      };
}

const CARD_STATUS_STYLES: Record<CardStatus, { label: string; text: string; bg: string; border: string; iconType?: ComboAction['type']; symbolOnly?: boolean }> = {
  equip: { label: 'Equipped', text: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/30' },
  summon: { label: 'Summon', text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'special-summon': { label: 'SS', text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'normal-summon': { label: 'NS', text: 'text-amber-700', bg: 'bg-amber-700/15', border: 'border-amber-700/40' },
  ritual: { label: 'Ritual', text: 'text-blue-700', bg: 'bg-blue-700/10', border: 'border-blue-700/30' },
  'send-gy': { label: 'In GY', text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
  activate: { label: 'Activated', text: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/30' },
  target: { label: 'Target', text: 'text-rose-300', bg: 'bg-rose-300/10', border: 'border-rose-300/30' },
  search: { label: 'Searched', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  banish: { label: 'Banished', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  draw: { label: 'Drawn', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  set: { label: 'Set', text: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/30' },
  tribute: { label: 'Tributed', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  link: { label: 'Linked', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  xyz: { label: 'Xyz', text: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/30' },
  synchro: { label: 'Synchro', text: 'text-white', bg: 'bg-emerald-300/10', border: 'border-emerald-300/30' },
  fusion: { label: 'Fusion', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  pendulum: { label: 'Pendulum', text: 'text-white', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-400/40' },
  scale: { label: 'Scale', text: 'text-white', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-400/40' },
  return: { label: 'Returned', text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  negate: { label: 'Negated', text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  destroy: { label: 'Destroyed', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  discard: { label: 'Discarded', text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
  detach: { label: 'Detached', text: 'text-yellow-200', bg: 'bg-yellow-200/10', border: 'border-yellow-200/30' },
  reveal: { label: 'Revealed', text: 'text-teal-300', bg: 'bg-teal-300/10', border: 'border-teal-300/30' },
  continuous: { label: 'Continuous Spell', text: 'text-cyan-200', bg: 'bg-cyan-300/10', border: 'border-cyan-300/30' },
  'field-spell': { label: 'Field Spell Zone', text: 'text-lime-300', bg: 'bg-lime-300/10', border: 'border-lime-300/30' },
  generic: { label: 'Affected', text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
};

function CardStatusBadge({ status }: { status: CardStatus }) {
  const style = CARD_STATUS_STYLES[status];

  return (
    <div
      className={`rounded-full border px-2 py-1 text-[10px] font-display font-semibold ${style.text} ${style.bg} ${style.border} ${style.symbolOnly ? 'flex h-8 w-8 items-center justify-center px-0 py-0' : ''}`}
    >
      {style.symbolOnly && style.iconType ? (
        <EffectGlyph type={style.iconType} className={`h-4.5 w-4.5 ${style.text}`} />
      ) : (
        style.label
      )}
    </div>
  );
}

export function CardHudCallout({
  anchorRect,
  text,
}: {
  anchorRect?: CardHudAnchor | null;
  cardName?: string;
  text: string;
}) {
  if (!anchorRect) return null;

  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const margin = 12;
  const gap = 24;
  const boxHeight = 48;
  const minBoxWidth = 220;
  const preferredBoxWidth = 360;
  const availableRight = viewportWidth - anchorRect.right - gap - margin;
  const maxBoxWidth = Math.max(180, viewportWidth - (margin * 2));
  const boxWidth = Math.min(preferredBoxWidth, maxBoxWidth);
  const preferredBoxLeft = availableRight >= minBoxWidth
    ? anchorRect.right + gap
    : Math.max(anchorRect.right + 8, viewportWidth - boxWidth - margin);
  const boxLeft = Math.min(
    Math.max(margin, preferredBoxLeft),
    Math.max(margin, viewportWidth - boxWidth - margin),
  );
  const anchorX = anchorRect.right;
  const anchorY = anchorRect.bottom;
  const bottomAlignedBoxTop = viewportHeight - boxHeight - 56;
  const lowerBoxTop = Math.max(anchorRect.bottom + 104, bottomAlignedBoxTop);
  const boxTop = Math.min(
    Math.max(lowerBoxTop, margin),
    Math.max(margin, viewportHeight - boxHeight - margin),
  );
  const boxCenterY = boxTop + (boxHeight / 2);
  const elbowX = Math.max(anchorX + 8, boxLeft - 22);

  const callout = (
    <motion.aside
      className="pointer-events-none fixed inset-0 z-[70] overflow-visible text-cyan-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_0_10px_rgba(0,212,255,0.42)]">
        <motion.circle
          cx={anchorX}
          cy={anchorY}
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: [0, 1.35, 1] }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ transformOrigin: `${anchorX}px ${anchorY}px` }}
        />
        <motion.circle
          cx={anchorX}
          cy={anchorY}
          r="2.5"
          fill="currentColor"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: [0, 1.35, 1] }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ transformOrigin: `${anchorX}px ${anchorY}px` }}
        />
        <motion.polyline
          points={`${anchorX},${anchorY} ${elbowX},${boxCenterY} ${boxLeft},${boxCenterY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.16, duration: 0.42, ease: 'easeOut' }}
        />
      </svg>
      <motion.div
        className="absolute overflow-hidden rounded-[2px] border border-cyan-300/90 bg-slate-950/60 shadow-[0_0_12px_rgba(0,212,255,0.22)] backdrop-blur-sm"
        style={{
          left: `${boxLeft}px`,
          top: `${boxTop}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          transformOrigin: 'left center',
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.52, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2 border-cyan-300" aria-hidden="true" />
        <div className="absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2 border-cyan-300" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-cyan-300" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-cyan-300" aria-hidden="true" />
        <motion.p
          className="flex h-full items-center overflow-hidden whitespace-pre-wrap break-words px-3 font-mono text-[11px] font-semibold leading-snug text-cyan-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.84, duration: 0.2 }}
        >
          {text}
        </motion.p>
      </motion.div>
    </motion.aside>
  );

  return createPortal(callout, document.body);
}

export function CardInfoEditorPanel({
  cardName,
  value,
  onChange,
}: {
  cardName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <aside className="flex h-full w-[min(34vw,380px)] min-w-[280px] flex-col rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.06] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md max-md:absolute max-md:inset-x-3 max-md:bottom-3 max-md:h-[42dvh] max-md:w-auto max-md:min-w-0">
      <div className="shrink-0 border-b border-cyan-200/15 pb-3">
        <p className="text-xs font-display font-semibold uppercase text-cyan-100/65">Card info</p>
        <p className="mt-1 line-clamp-2 text-sm font-display font-semibold text-white/90">
          {cardName}
        </p>
      </div>
      <label className="mt-3 min-h-0 flex-1">
        <span className="sr-only">Additional information for {cardName}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add notes, timing, reminders..."
          className="h-full min-h-36 w-full resize-none rounded-xl border border-cyan-200/20 bg-black/35 p-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/25"
        />
      </label>
    </aside>
  );
}

export function CardActivationOverlay({ className }: { className?: string }) {
  return (
    <div className={cn('activate-cursor', className)} aria-hidden="true">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border bg-secondary/90 ${EFFECT_STYLES.activate.border}`}>
        <EffectGlyph type="activate" className="h-4 w-4" />
      </div>
    </div>
  );
}

function HandZoneIcon({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className={cn(className)}>
      <motion.svg
        animate={reducedMotion ? 'normal' : 'animate'}
        fill="none"
        height={14}
        initial="normal"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        variants={{
          normal: { rotate: 0, originX: '50%', originY: '90%' },
          animate: {
            rotate: [0, -15, 10, -5, 0],
            transition: {
              duration: 0.8,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.35,
            },
          },
        }}
        viewBox="0 0 24 24"
        width={14}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </motion.svg>
    </div>
  );
}

function ScaleBorderGlow({ side }: { side?: ScaleSide }) {
  return (
    <span aria-hidden="true" data-scale-border-glow data-scale-side={side} className="border-glow-card sweep-active scale-border-glow">
      <span className="edge-light" />
    </span>
  );
}

export function ExtraDeckZoneIcon({ className, size = 14 }: { className?: string; size?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className={cn(className)}>
      <motion.svg
        fill="none"
        height={size}
        initial="normal"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <motion.path
          animate={reducedMotion ? 'normal' : 'animate'}
          d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"
          variants={{
            normal: { y: 0 },
            animate: {
              y: [0, -9, 0],
              transition: {
                duration: 0.9,
                times: [0, 0.45, 1],
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 0.25,
              },
            },
          }}
        />
        <motion.path
          animate={reducedMotion ? 'normal' : 'animate'}
          d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"
          variants={{
            normal: { y: 0 },
            animate: {
              y: [0, -5, 0],
              transition: {
                duration: 0.9,
                times: [0, 0.45, 1],
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 0.25,
              },
            },
          }}
        />
      </motion.svg>
    </div>
  );
}

const ZONE_META: Record<CardZone, { label: string; className: string; Icon?: typeof Skull | typeof LayersPlus; effectType?: ComboAction['type']; customIcon?: 'hand' | 'extra-deck' }> = {
  hand: { label: 'Hand', className: 'text-amber-300 bg-amber-400/10 border-amber-400/30', customIcon: 'hand' },
  gy: { label: 'GY', className: 'text-slate-300 bg-slate-400/10 border-slate-400/30', Icon: Skull },
  deck: { label: 'Deck', className: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30', Icon: LayersPlus },
  'extra-deck': { label: 'Extra Deck', className: 'text-violet-300 bg-violet-400/10 border-violet-400/30', customIcon: 'extra-deck' },
  banished: { label: 'Banished', className: 'text-purple-400 bg-purple-400/10 border-purple-400/30', effectType: 'banish' },
};

export function CardDisplay({
  name,
  artworkOnly = false,
  onPreviewOpenChange,
  customTag,
  actionType,
  useStarBorder = true,
  scaleSide,
  isScale = false,
  zone,
  originZone,
  statuses = [],
  leftEffectTypes = [],
  isActivated = false,
  centerOverlay,
  topLeftOverlay,
  compact = false,
  showZoneBadge = true,
  size,
  cardInfo,
  onCardInfoChange,
}: {
  name: string;
  artworkOnly?: boolean;
  onPreviewOpenChange?: (open: boolean) => void;
  customTag?: string;
  actionType?: ComboAction['type'];
  useStarBorder?: boolean;
  scaleSide?: ScaleSide;
  isScale?: boolean;
  zone?: CardZone;
  originZone?: CardZone;
  statuses?: CardStatus[];
  leftEffectTypes?: ComboAction['type'][];
  isActivated?: boolean;
  centerOverlay?: ReactNode;
  topLeftOverlay?: ReactNode;
  compact?: boolean;
  showZoneBadge?: boolean;
  size?: CardDisplaySize;
  cardInfo?: string;
  onCardInfoChange?: (value: string) => void;
}) {
  const isScaleCard = isScale || actionType === 'scale' || statuses.includes('scale');
  const slotCardNames = getSlotCardNames(name);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const activeCardName = slotCardNames[activeCardIndex] || slotCardNames[0];
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCardName, setPreviewCardName] = useState(activeCardName);
  const [showRelatedCards, setShowRelatedCards] = useState(false);
  const [showCardInfoEditor, setShowCardInfoEditor] = useState(false);
  const [localCardInfo, setLocalCardInfo] = useState(cardInfo ?? '');
  const [isHudVisible, setIsHudVisible] = useState(false);
  const [hudAnchorRect, setHudAnchorRect] = useState<CardHudAnchor | null>(null);
  useEffect(() => {
    if (!isHudVisible) return;
    const hideOnScroll = () => setIsHudVisible(false);
    window.addEventListener('scroll', hideOnScroll, { capture: true, passive: true });
    window.addEventListener('resize', hideOnScroll);
    return () => {
      window.removeEventListener('scroll', hideOnScroll, true);
      window.removeEventListener('resize', hideOnScroll);
    };
  }, [isHudVisible]);

  const cardArtworkRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useCardImage(activeCardName);
  const { data: previewData, isLoading: isPreviewLoading } = useCardImage(previewCardName);
  const {
    data: relatedCardsData,
    isLoading: areRelatedCardsLoading,
  } = useRelatedCards(previewData?.name || previewCardName, isPreviewOpen && showRelatedCards);
  useEffect(() => {
    onPreviewOpenChange?.(isPreviewOpen);
  }, [isPreviewOpen, onPreviewOpenChange]);
  const isSummonedFromOffFieldZone = statuses.includes('special-summon') && (zone === 'gy' || zone === 'banished');
  const zoneMeta = zone && !isSummonedFromOffFieldZone ? ZONE_META[zone] : undefined;
  const originZoneMeta = originZone ? ZONE_META[originZone] : undefined;
  const cardLabel = data?.name || activeCardName;
  const previewCardLabel = previewData?.name || previewCardName;
  const displayedCardInfo = cardInfo ?? localCardInfo;
  const trimmedCardInfo = displayedCardInfo.trim();
  const isPreviewEnabled = !compact;
  const inheritedSize = useContext(CardDisplaySizeContext);
  const resolvedSize = size ?? inheritedSize;
  const dimensions = getCardDimensions(resolvedSize);

  useEffect(() => {
    setActiveCardIndex(0);
  }, [name]);

  useEffect(() => {
    if (slotCardNames.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveCardIndex((current) => (current + 1) % slotCardNames.length);
    }, CARD_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [name, slotCardNames.length]);

  useEffect(() => {
    if (!isPreviewOpen) {
      setPreviewCardName(cardLabel);
      setShowRelatedCards(false);
      setShowCardInfoEditor(false);
    }
  }, [cardLabel, isPreviewOpen]);

  useEffect(() => {
    if (cardInfo !== undefined) {
      setLocalCardInfo(cardInfo);
    }
  }, [cardInfo]);

  const openPreview = () => {
    if (!isPreviewEnabled) return;
    setPreviewCardName(cardLabel);
    setIsPreviewOpen(true);
  };

  const updateCardInfo = (value: string) => {
    setLocalCardInfo(value);
    onCardInfoChange?.(value);
  };

  const showHud = () => {
    setHudAnchorRect(cardArtworkRef.current ? getCardHudAnchor(cardArtworkRef.current.getBoundingClientRect()) : null);
    setIsHudVisible(true);
  };

  const hideHud = () => {
    setIsHudVisible(false);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isPreviewEnabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setIsPreviewOpen(true);
  };

  const cardContent = (
    <>
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="relative h-full w-full overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={activeCardName}
              src={data.imageUrl}
              alt={data.name}
              className="absolute inset-0 h-full w-full object-contain"
              loading="lazy"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.015 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
            />
          </AnimatePresence>
          {slotCardNames.length > 1 && (
            <motion.div
              key={`glare-${activeCardName}`}
              aria-hidden="true"
              data-card-slot-glare
              className="pointer-events-none absolute inset-y-[-35%] w-[48%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
              initial={{ left: '-65%', opacity: 0 }}
              animate={{ left: '125%', opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.72, ease: 'easeInOut' }}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
          {activeCardName}
        </div>
      )}
    </>
  );

  const zoneBadge = showZoneBadge && zoneMeta ? (
    <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-display font-semibold ${zoneMeta.className}`}>
      {zoneMeta.effectType ? (
        <EffectGlyph type={zoneMeta.effectType} className="h-3.5 w-3.5" />
      ) : zoneMeta.customIcon === 'hand' ? (
        <HandZoneIcon className="h-3.5 w-3.5" />
      ) : zoneMeta.customIcon === 'extra-deck' ? (
        <ExtraDeckZoneIcon className="h-3.5 w-3.5" />
      ) : zoneMeta.Icon ? (
        <zoneMeta.Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : null}
      <span>{zoneMeta.label}</span>
    </div>
  ) : null;
  const originZoneBadge = showZoneBadge && originZoneMeta ? (
    <SourceZoneBadge zone={originZone} />
  ) : null;
  const customTagBadge = customTag ? (
    <div className="max-w-full rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-300/20 to-fuchsia-300/20 px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-wide text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.16)] backdrop-blur-sm">
      <span className="bg-gradient-to-r from-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
        {customTag}
      </span>
    </div>
  ) : null;

  if (compact) {
    return (
      <div
        className="relative overflow-visible"
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      >
        {(customTagBadge || statuses.length > 0) && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center justify-center gap-1 px-2">
            {customTagBadge}
            <div className="flex flex-wrap items-center justify-center gap-1">
              {statuses.map((status, index) => {
                return (
                  <div key={`${status}-${index}`} className="backdrop-blur-sm">
                    <CardStatusBadge status={status} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {topLeftOverlay && (
          <div className="pointer-events-none absolute left-2 top-2 z-10">
            {topLeftOverlay}
          </div>
        )}
        {centerOverlay && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {centerOverlay}
          </div>
        )}
        {(zoneBadge || originZoneBadge) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-col items-center justify-center gap-1 px-2">
            {zoneBadge}
            {originZoneBadge}
          </div>
      )}
      {isScaleCard && <ScaleBorderGlow side={scaleSide} />}
      <div className="relative z-[1] h-full w-full">
          {cardContent}
        </div>
      </div>
    );
  }

  const cardArtwork = (
    <div
      ref={cardArtworkRef}
      className={cn(
        'relative transition-transform duration-200',
        artworkOnly && 'h-full w-full',
        isPreviewEnabled && 'cursor-zoom-in hover:scale-[1.02] focus-visible:scale-[1.02]',
      )}
      onDoubleClick={openPreview}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={showHud}
      onMouseLeave={hideHud}
      role={isPreviewEnabled ? 'button' : undefined}
      tabIndex={isPreviewEnabled ? 0 : undefined}
      aria-label={isPreviewEnabled ? `Open full screen view for ${cardLabel} with a double click` : undefined}
    >
      {topLeftOverlay && (
        <div className="pointer-events-none absolute left-2 top-2 z-10">
          {topLeftOverlay}
        </div>
      )}
      {centerOverlay && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          {centerOverlay}
        </div>
      )}
      {isActivated && <CardActivationOverlay />}
      {isScaleCard && <ScaleBorderGlow side={scaleSide} />}
      <div
        className="relative z-[1] card-shadow border border-border/50 bg-secondary"
        style={artworkOnly ? { width: '100%', height: '100%' } : { width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      >
        {cardContent}
      </div>
    </div>
  );

  return (
    <>
      {artworkOnly ? cardArtwork : (
      <div className="flex shrink-0 flex-col items-center" style={{ width: `${dimensions.width}px` }}>
        <div
          className="flex h-16 w-full shrink-0 flex-col items-center justify-end gap-1"
          data-card-top-badge-rail
        >
          {customTagBadge}
          <div className="flex flex-wrap items-center justify-center gap-2">
          {statuses.map((status, index) => {
            return (
              <CardStatusBadge key={`${status}-${index}`} status={status} />
            );
          })}
          </div>
        </div>
        <div className="relative flex w-full items-center justify-center">
          <div
            className="absolute right-full mr-2 flex flex-col items-center justify-center gap-2"
            style={{ minHeight: `${dimensions.leftRailMinHeight}px`, width: `${dimensions.leftRailWidth}px` }}
          >
            {leftEffectTypes.map((effectType, index) => {
              const { text, bg, border } = EFFECT_STYLES[effectType];
              return (
                <div
                  key={`${effectType}-${index}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${bg} ${border}`}
                >
                  <EffectGlyph type={effectType} className={`h-5 w-5 ${text}`} />
                </div>
              );
            })}
          </div>
          {cardArtwork}
        </div>
        <div className="mt-2 flex min-h-8 w-full flex-col items-center justify-center gap-1">
          {zoneBadge}
          {originZoneBadge}
        </div>
        <span className="mt-2 w-full text-center text-xs font-body leading-tight text-muted-foreground whitespace-normal break-words">
          {cardLabel}
        </span>
      </div>
      )}
      <AnimatePresence>
        {isPreviewEnabled && !isPreviewOpen && isHudVisible && trimmedCardInfo && (
          <CardHudCallout anchorRect={hudAnchorRect} cardName={cardLabel} text={trimmedCardInfo} />
        )}
      </AnimatePresence>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black/95 p-3 sm:rounded-none sm:p-6">
          <DialogTitle className="sr-only">{previewCardLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Full screen preview for {previewCardLabel}
          </DialogDescription>
          <div className="flex h-full w-full items-stretch justify-center gap-4 overflow-hidden">
            <div className="relative flex min-w-0 flex-1 items-center justify-center">
              <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCardInfoEditor((current) => !current);
                    setShowRelatedCards(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10 text-cyan-50 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-cyan-200/40 hover:bg-cyan-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/50"
                  aria-label={showCardInfoEditor ? 'Hide card info' : 'Show card info'}
                  title={showCardInfoEditor ? 'Hide card info' : 'Show card info'}
                >
                  <Info className="h-5 w-5" strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRelatedCards((current) => !current);
                    setShowCardInfoEditor(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
                  title={showRelatedCards ? 'Hide related cards' : 'Show related cards'}
                >
                  <Plus className={cn('h-5 w-5 transition-transform duration-200', showRelatedCards && 'rotate-45')} strokeWidth={2.3} />
                </button>
              </div>
              {isPreviewLoading ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  </div>
                ) : previewData ? (
                  <div className="relative flex min-h-0 max-w-full rounded-2xl">
                    {isScaleCard && previewCardName === activeCardName && <ScaleBorderGlow side={scaleSide} />}
                  <img
                    src={previewData.imageUrl}
                    alt={previewData.name}
                    className="relative z-[1] h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)]"
                  />
                  </div>
                ) : (
                  <div className="flex h-[min(calc(100dvh-2rem),720px)] w-[min(86vw,520px)] items-center justify-center rounded-[28px] border border-white/15 bg-white/5 p-8 text-center text-xl text-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[min(calc(100dvh-3rem),720px)]">
                    {previewCardLabel}
                  </div>
                )}
            </div>
            {showRelatedCards && (
              <aside className="flex h-full w-[min(34vw,360px)] min-w-[260px] flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md max-md:absolute max-md:inset-x-3 max-md:bottom-3 max-md:h-[42dvh] max-md:w-auto max-md:min-w-0">
                <div className="shrink-0 border-b border-white/10 pb-3">
                  <p className="text-xs font-display font-semibold uppercase tracking-wide text-white/45">Related cards</p>
                  <p className="mt-1 line-clamp-2 text-sm font-display font-semibold text-white/90">
                    {relatedCardsData?.archetype || previewCardLabel}
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
                            card.name === previewCardLabel ? 'border-white/45 bg-white/12' : 'border-white/10',
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
            {showCardInfoEditor && (
              <CardInfoEditorPanel
                cardName={cardLabel}
                value={displayedCardInfo}
                onChange={updateCardInfo}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SourceZoneBadge({
  zone,
  prefix = 'From',
  className,
}: {
  zone?: CardZone;
  prefix?: string;
  className?: string;
}) {
  if (!zone) return null;

  const zoneMeta = ZONE_META[zone];
  if (!zoneMeta) return null;

  return (
    <div className={cn('flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-display font-semibold', zoneMeta.className, className)}>
      {zoneMeta.effectType ? (
        <EffectGlyph type={zoneMeta.effectType} className="h-3.5 w-3.5" />
      ) : zoneMeta.customIcon === 'hand' ? (
        <HandZoneIcon className="h-3.5 w-3.5" />
      ) : zoneMeta.customIcon === 'extra-deck' ? (
        <ExtraDeckZoneIcon className="h-3.5 w-3.5" />
      ) : zoneMeta.Icon ? (
        <zoneMeta.Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : null}
      <span>{prefix} {zoneMeta.label}</span>
    </div>
  );
}
