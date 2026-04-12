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
};

const DEFAULT_ACTION_COLOR = { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' };

export function ComboStepVisual({ action, stepNumber }: { action: ComboAction; stepNumber: number }) {
  const color = ACTION_COLORS[action.label] || DEFAULT_ACTION_COLOR;

  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
      {/* Step label */}
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-sm text-sky-300 bg-sky-300/10 px-3 py-1 rounded-full border border-sky-300/30">
          Step {stepNumber}
        </span>
        <span className={`font-display font-semibold text-sm px-3 py-1 rounded-full ${color.text} ${color.bg} ${color.border} border`}>
          {action.label}
        </span>
      </div>

      {/* Visual */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <CardDisplay name={action.sourceCard} />

        {action.targetCard && (
          <>
            <div className="flex flex-col items-center gap-1">
              <ActionIcon type={action.type} />
              <ActionArrow />
            </div>
            <CardDisplay name={action.targetCard} />
          </>
        )}

        {!action.targetCard && (
          <div className="ml-3">
            <ActionIcon type={action.type} />
          </div>
        )}
      </div>
    </div>
  );
}
