import { useState } from 'react';
import { getSavedCombos, saveCombo, deleteCombo, type SavedCombo } from '@/lib/comboLibrary';

interface ComboLibraryProps {
  currentText: string;
  onLoad: (combo: SavedCombo) => void;
}

export function ComboLibrary({ currentText, onLoad }: ComboLibraryProps) {
  const [combos, setCombos] = useState<SavedCombo[]>(getSavedCombos);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const handleSave = () => {
    if (!saveName.trim() || !currentText.trim()) return;
    const combo = saveCombo(saveName.trim(), currentText);
    setCombos([combo, ...combos]);
    setSaveName('');
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    deleteCombo(id);
    setCombos(combos.filter(c => c.id !== id));
  };

  return (
    <div className="glass-panel rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">📚 Combo Library</h2>
        <button
          onClick={() => setShowSave(!showSave)}
          disabled={!currentText.trim()}
          className="px-4 py-1.5 bg-primary/90 text-primary-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Save Current
        </button>
      </div>

      {showSave && (
        <div className="flex gap-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Combo name..."
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
      )}

      {combos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No saved combos yet. Write a combo and save it!
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex items-center gap-3 bg-secondary/40 rounded-lg px-3 py-2.5 group hover:bg-secondary/70 transition-colors"
            >
              <button
                onClick={() => onLoad(combo)}
                className="flex-1 text-left min-w-0"
              >
                <span className="font-display font-semibold text-sm text-foreground block truncate">
                  {combo.name}
                </span>
                <span className="text-xs text-muted-foreground truncate block">
                  {combo.text.split('\n').length} step{combo.text.split('\n').length !== 1 ? 's' : ''}
                </span>
              </button>
              <button
                onClick={() => handleDelete(combo.id)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 text-sm shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
