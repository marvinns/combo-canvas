import { useEffect, useState } from 'react';
import { getSavedCombos, saveCombo, updateCombo, renameDeck, duplicateCombo, deleteCombo, type SavedCombo } from '@/lib/comboLibrary';

interface ComboLibraryProps {
  currentText: string;
  activeComboId?: string | null;
  externalSavedCombo?: SavedCombo | null;
  onLoad: (combo: SavedCombo) => void;
  onSave?: (combo: SavedCombo) => void;
}

const DECK_NAME_STYLES = [
  'text-rose-300',
  'text-amber-300',
  'text-emerald-300',
  'text-sky-300',
  'text-cyan-300',
  'text-violet-300',
  'text-fuchsia-300',
  'text-orange-300',
] as const;

function getDeckNameStyle(deck: string) {
  let hash = 0;

  for (let index = 0; index < deck.length; index += 1) {
    hash = (hash * 31 + deck.charCodeAt(index)) >>> 0;
  }

  return DECK_NAME_STYLES[hash % DECK_NAME_STYLES.length];
}

export function ComboLibrary({ currentText, activeComboId, externalSavedCombo, onLoad, onSave }: ComboLibraryProps) {
  const [combos, setCombos] = useState<SavedCombo[]>(getSavedCombos);
  const [saveDeck, setSaveDeck] = useState('');
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [editDeck, setEditDeck] = useState('');
  const [editName, setEditName] = useState('');
  const [isRenamingDeck, setIsRenamingDeck] = useState(false);
  const [renameDeckValue, setRenameDeckValue] = useState('');
  const deckOptions = Array.from(new Set(combos.map((combo) => combo.deck))).sort((a, b) => a.localeCompare(b));
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const visibleCombos = selectedDeck === 'all'
    ? combos
    : combos.filter((combo) => combo.deck === selectedDeck);

  useEffect(() => {
    if (!externalSavedCombo) return;

    setCombos((current) => {
      const existingIndex = current.findIndex((combo) => combo.id === externalSavedCombo.id);
      if (existingIndex === -1) {
        return [externalSavedCombo, ...current];
      }

      return current.map((combo) => combo.id === externalSavedCombo.id ? externalSavedCombo : combo);
    });
  }, [externalSavedCombo]);

  const handleSave = () => {
    if (!saveDeck.trim() || !saveName.trim() || !currentText.trim()) return;
    const combo = saveCombo(saveDeck.trim(), saveName.trim(), currentText);
    setCombos([combo, ...combos]);
    setSelectedDeck(combo.deck);
    setSaveDeck('');
    setSaveName('');
    setShowSave(false);
    onSave?.(combo);
  };

  const handleSaveChanges = () => {
    if (!activeComboId || !currentText.trim()) return;

    const activeCombo = combos.find((combo) => combo.id === activeComboId);
    if (!activeCombo) return;

    const updatedCombo = updateCombo(activeComboId, { text: currentText });
    if (!updatedCombo) return;

    setCombos((current) => current.map((combo) => combo.id === activeComboId ? updatedCombo : combo));
    onSave?.(updatedCombo);
  };

  const handleDelete = (id: string) => {
    deleteCombo(id);
    setCombos(combos.filter(c => c.id !== id));
  };

  const handleDuplicate = (id: string) => {
    const copiedCombo = duplicateCombo(id);
    if (!copiedCombo) return;

    setCombos((current) => [copiedCombo, ...current]);
    setSelectedDeck(copiedCombo.deck);
    onSave?.(copiedCombo);
  };

  const handleStartComboRename = (combo: SavedCombo) => {
    setEditingComboId(combo.id);
    setEditDeck(combo.deck);
    setEditName(combo.name);
  };

  const handleRenameCombo = () => {
    if (!editingComboId || !editName.trim()) return;
    const updatedCombo = updateCombo(editingComboId, {
      deck: editDeck,
      name: editName.trim(),
    });
    if (!updatedCombo) return;

    setCombos((current) => current.map((combo) => combo.id === editingComboId ? updatedCombo : combo));
    if (activeComboId === editingComboId) {
      onSave?.(updatedCombo);
    }
    setEditingComboId(null);
    setEditDeck('');
    setEditName('');
  };

  const handleRenameDeck = () => {
    if (selectedDeck === 'all' || !renameDeckValue.trim()) return;
    const updatedCombos = renameDeck(selectedDeck, renameDeckValue);
    setCombos(updatedCombos);
    setSelectedDeck(renameDeckValue.trim());
    setIsRenamingDeck(false);
    setRenameDeckValue('');
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

      {activeComboId && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={!currentText.trim()}
            className="px-4 py-1.5 bg-accent/90 text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      )}

      {showSave && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={saveDeck}
              onChange={(e) => setSaveDeck(e.target.value)}
              placeholder="Deck name..."
              className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Combo name..."
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
        </div>
      )}

      {combos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No saved combos yet. Write a combo and save it!
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-semibold text-muted-foreground">Deck</span>
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              className="min-w-[180px] bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Decks</option>
              {deckOptions.map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
            {selectedDeck !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setIsRenamingDeck((current) => !current);
                  setRenameDeckValue(selectedDeck);
                }}
                className="px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Rename Deck
              </button>
            )}
          </div>
          {isRenamingDeck && selectedDeck !== 'all' && (
            <div className="flex gap-2">
              <input
                value={renameDeckValue}
                onChange={(e) => setRenameDeckValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameDeck()}
                placeholder="New deck name..."
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={handleRenameDeck}
                className="px-4 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
              >
                Save
              </button>
            </div>
          )}
          <div className="scroll-list-container">
          <div className="top-gradient" />
          <div className="scroll-list">
            {visibleCombos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No saved combos for this deck yet.
              </p>
            ) : visibleCombos.map((combo) => (
              <div
                key={combo.id}
                className="item flex items-center gap-3 group hover:!bg-secondary/70 transition-colors cursor-pointer"
              >
                {editingComboId === combo.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      value={editDeck}
                      onChange={(e) => setEditDeck(e.target.value)}
                      placeholder="Deck name..."
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameCombo()}
                        placeholder="Combo name..."
                        className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        type="button"
                        onClick={handleRenameCombo}
                        className="px-3 py-2 bg-accent text-accent-foreground font-display font-semibold rounded-lg text-xs hover:brightness-110 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onLoad(combo)}
                      className="flex-1 text-left min-w-0"
                    >
                      <span className={`text-[11px] font-display font-semibold uppercase tracking-wide block truncate ${getDeckNameStyle(combo.deck)}`}>
                        {combo.deck}
                      </span>
                      <span className="item-text font-display font-semibold text-sm block truncate">
                        {combo.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {combo.text.split('\n').length} step{combo.text.split('\n').length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(combo.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0"
                      title="Copy"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartComboRename(combo)}
                      className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 text-sm shrink-0"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(combo.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 text-sm shrink-0"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="bottom-gradient" />
        </div>
        </div>
      )}
    </div>
  );
}
