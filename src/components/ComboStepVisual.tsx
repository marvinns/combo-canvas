import { useRef, useCallback } from 'react';
import type { ComboAction } from '@/lib/comboParser';
import { CardDisplay } from './CardDisplay';
import { ActionIcon, ActionArrow } from './ActionIcon';

const ACTION_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'Special Summon': { text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'Normal Summon': { text: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
  'Summon': { text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'Synchro Summon': { text: 'text-white', bg: 'bg-white/10', border: 'border-white/30' },
  'Fusion Summon': { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  'Link Summon': { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  'Search': { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' },
  'Add to Hand': { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' },
  'Send to GY': { text: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
};

const DEFAULT_ACTION_COLOR = { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' };

export function ComboStepVisual({ action, stepNumber }: { action: ComboAction; stepNumber: number }) {
  const labelsToRender = action.labels && action.labels.length > 0 ? action.labels : [action.label];
  const cardRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={cardRef}
      className="border-glow-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="edge-light" />
      <div className="border-glow-inner p-6 gap-4">
        {/* Step label */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display font-bold text-sm text-sky-300 bg-sky-300/10 px-3 py-1 rounded-full border border-sky-300/30">
            Step {stepNumber}
          </span>
          {labelsToRender.map((lbl) => {
            const color = ACTION_COLORS[lbl] || DEFAULT_ACTION_COLOR;
            return (
              <span key={lbl} className={`font-display font-semibold text-sm px-3 py-1 rounded-full ${color.text} ${color.bg} ${color.border} border`}>
                {lbl}
              </span>
            );
          })}
        </div>

        {/* Visual */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <CardDisplay name={action.sourceCard} actionType={action.type} />

          {action.targetCard && (
            <>
              <div className="flex flex-col items-center gap-1">
                <ActionIcon type={action.type} />
                <ActionArrow />
              </div>
              <CardDisplay name={action.targetCard} actionType={action.type} />
            </>
          )}

          {!action.targetCard && (
            <div className="ml-3">
              <ActionIcon type={action.type} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
