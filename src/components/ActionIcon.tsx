import type { ComboAction } from '@/lib/comboParser';

const icons: Record<ComboAction['type'], { emoji: string; color: string }> = {
  'summon': { emoji: '⭐', color: 'text-yellow-400' },
  'send-gy': { emoji: '💀', color: 'text-muted-foreground' },
  'activate': { emoji: '⚡', color: 'text-yellow-300' },
  'search': { emoji: '🔍', color: 'text-blue-400' },
  'banish': { emoji: '🌀', color: 'text-purple-400' },
  'draw': { emoji: '🃏', color: 'text-green-400' },
  'set': { emoji: '⬇️', color: 'text-blue-300' },
  'tribute': { emoji: '🔺', color: 'text-orange-400' },
  'link': { emoji: '🔗', color: 'text-blue-400' },
  'xyz': { emoji: '✨', color: 'text-yellow-300' },
  'synchro': { emoji: '🌟', color: 'text-emerald-300' },
  'fusion': { emoji: '🔮', color: 'text-purple-400' },
  'return': { emoji: '↩️', color: 'text-cyan-400' },
  'negate': { emoji: '🚫', color: 'text-red-400' },
  'destroy': { emoji: '💥', color: 'text-red-500' },
  'discard': { emoji: '📤', color: 'text-muted-foreground' },
  'detach': { emoji: '⭕', color: 'text-yellow-200' },
  'generic': { emoji: '▶️', color: 'text-muted-foreground' },
};

export function ActionIcon({ type }: { type: ComboAction['type'] }) {
  const { emoji } = icons[type];
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/80 border border-border">
      <span className="text-lg">{emoji}</span>
    </div>
  );
}

export function ActionArrow() {
  return (
    <div className="flex items-center px-2">
      <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-accent">
        <path d="M0 12H40M40 12L32 4M40 12L32 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
