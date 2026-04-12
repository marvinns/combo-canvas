import { useState } from 'react';
import { parseCombo, type ComboAction } from '@/lib/comboParser';
import { ComboStepVisual } from '@/components/ComboStepVisual';
import { ComboLibrary } from '@/components/ComboLibrary';
import type { SavedCombo } from '@/lib/comboLibrary';

const EXAMPLE_COMBO = `Special Summon [Diabellze the White Witch] from hand and send [Susurrus of the Sinful Spoils] to the Graveyard
Activate [Susurrus of the Sinful Spoils] targeting [Diabellze the White Witch]
Search [Guiding Light] from deck`;

export default function Index() {
  const [comboText, setComboText] = useState('');
  const [steps, setSteps] = useState<ComboAction[]>([]);

  const handleVisualize = () => {
    const parsed = parseCombo(comboText);
    setSteps(parsed);
  };

  const handleExample = () => {
    setComboText(EXAMPLE_COMBO);
    setSteps(parseCombo(EXAMPLE_COMBO));
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-foreground tracking-tight">
            Combo <span className="text-primary">Visualizer</span>
          </h1>
          <p className="text-muted-foreground font-body text-sm">
            Write your combo steps using <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">[Card Name]</code> brackets — get instant visuals
          </p>
        </header>

        {/* Input */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <textarea
            value={comboText}
            onChange={(e) => setComboText(e.target.value)}
            placeholder={`e.g. Special Summon [Diabellze the White Witch] from hand and send [Susurrus of the Sinful Spoils] to the Graveyard`}
            className="w-full h-36 bg-secondary/50 border border-border rounded-lg p-4 text-foreground font-body text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleVisualize}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-display font-semibold rounded-lg glow-primary hover:brightness-110 transition-all text-sm"
            >
              Visualize Combo
            </button>
            <button
              onClick={handleExample}
              className="px-5 py-2.5 bg-secondary text-secondary-foreground font-display font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all text-sm"
            >
              Load Example
            </button>
          </div>
        </div>

        {/* Syntax help */}
        <details className="glass-panel rounded-xl p-4">
          <summary className="font-display font-semibold text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            📖 Syntax Guide
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-body text-muted-foreground">
            {[
              'Special Summon [Card A] from hand',
              'Normal Summon [Card A]',
              '[Card A] sends [Card B] to the GY',
              'Activate [Card A] targeting [Card B]',
              'Search [Card A] from deck',
              'Link Summon [Card A]',
              'Xyz Summon [Card A]',
              'Synchro Summon [Card A]',
              'Banish [Card A]',
              'Discard [Card A]',
            ].map((ex) => (
              <code key={ex} className="bg-secondary/50 px-2 py-1 rounded">{ex}</code>
            ))}
          </div>
        </details>

        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-foreground">
              Combo Breakdown
            </h2>
            {steps.map((step, i) => (
              <ComboStepVisual key={i} action={step} stepNumber={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
