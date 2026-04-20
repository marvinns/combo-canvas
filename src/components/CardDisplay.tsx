import type { ReactNode } from 'react';
import { useCardImage } from '@/hooks/useCardImage';
import type { CardZone, ComboAction } from '@/lib/comboParser';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { LayersPlus, Skull } from 'lucide-react';
import { EFFECT_STYLES, EffectGlyph } from './ActionIcon';

type CardStatus = ComboAction['type'] | 'special-summon' | 'normal-summon';

const CARD_STATUS_STYLES: Record<CardStatus, { label: string; text: string; bg: string; border: string; iconType?: ComboAction['type']; symbolOnly?: boolean }> = {
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
  continuous: { label: '', text: 'text-cyan-200', bg: 'bg-cyan-300/10', border: 'border-cyan-300/30', iconType: 'continuous', symbolOnly: true },
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

function HandZoneIcon({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <motion.svg
        animate="animate"
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

function ExtraDeckZoneIcon({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <motion.svg
        fill="none"
        height={14}
        initial="normal"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={14}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <motion.path
          animate="animate"
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
          animate="animate"
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
  actionType,
  useStarBorder = true,
  zone,
  statuses = [],
  leftEffectTypes = [],
  isActivated = false,
  centerOverlay,
  topLeftOverlay,
  compact = false,
  showZoneBadge = true,
}: {
  name: string;
  actionType?: ComboAction['type'];
  useStarBorder?: boolean;
  zone?: CardZone;
  statuses?: CardStatus[];
  leftEffectTypes?: ComboAction['type'][];
  isActivated?: boolean;
  centerOverlay?: ReactNode;
  topLeftOverlay?: ReactNode;
  compact?: boolean;
  showZoneBadge?: boolean;
}) {
  const { data, isLoading } = useCardImage(name);
  const zoneMeta = zone ? ZONE_META[zone] : undefined;

  const cardContent = (
    <>
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <img
          src={data.imageUrl}
          alt={data.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
          {name}
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

  if (compact) {
    return (
      <div className="relative h-[204px] w-[140px] overflow-visible">
        {statuses.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-2">
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
        {zoneBadge && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-2">
            {zoneBadge}
          </div>
        )}
        <div className="h-full w-full">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[140px] flex-col items-center shrink-0">
      <div className="flex min-h-8 w-full items-center justify-center gap-2">
        {statuses.map((status, index) => {
          return (
            <CardStatusBadge key={`${status}-${index}`} status={status} />
          );
        })}
      </div>
      <div className="relative flex w-full items-center justify-center">
        <div className="absolute right-full mr-2 flex min-h-[204px] w-10 flex-col items-center justify-center gap-2">
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
        <div className="relative">
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
          {isActivated && (
            <div className="activate-cursor" aria-hidden="true">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border bg-secondary/90 ${EFFECT_STYLES.activate.border}`}>
                <EffectGlyph type="activate" className="h-4 w-4" />
              </div>
            </div>
          )}
          <div className="w-[140px] h-[204px] card-shadow border border-border/50 bg-secondary">
            {cardContent}
          </div>
        </div>
      </div>
      <div className="mt-2 flex min-h-8 w-full items-center justify-center">
        {zoneBadge}
      </div>
      <span className="mt-2 w-full text-center text-xs font-body leading-tight text-muted-foreground whitespace-normal break-words">
        {data?.name || name}
      </span>
    </div>
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
