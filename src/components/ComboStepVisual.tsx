import type { ComboAction } from '@/lib/comboParser';
import { CardDisplay } from './CardDisplay';
import { ActionIcon, ActionArrow } from './ActionIcon';

export function ComboStepVisual({ action, stepNumber }: { action: ComboAction; stepNumber: number }) {
  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
      {/* Step label */}
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-sm text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/30">
          Step {stepNumber}
        </span>
        <span className="font-display font-semibold text-accent text-sm bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
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
