import type { ComboAction } from '@/lib/comboParser';
import { Star, Skull, Zap, Search, CircleDot, Spade, ArrowDown, Triangle, Link, Sparkles, Sun, Gem, RotateCcw, Ban, Bomb, Upload, Circle, Play } from 'lucide-react';

const icons: Record<ComboAction['type'], { Icon: React.ComponentType<any>; color: string }> = {
  'summon': { Icon: Star, color: 'text-yellow-400' },
  'send-gy': { Icon: Skull, color: 'text-muted-foreground' },
  'activate': { Icon: Zap, color: 'text-yellow-300' },
  'search': { Icon: Search, color: 'text-blue-400' },
  'banish': { Icon: CircleDot, color: 'text-purple-400' },
  'draw': { Icon: Spade, color: 'text-green-400' },
  'set': { Icon: ArrowDown, color: 'text-blue-300' },
  'tribute': { Icon: Triangle, color: 'text-orange-400' },
  'link': { Icon: Link, color: 'text-blue-400' },
  'xyz': { Icon: Sparkles, color: 'text-yellow-300' },
  'synchro': { Icon: Sun, color: 'text-emerald-300' },
  'fusion': { Icon: Gem, color: 'text-purple-400' },
  'return': { Icon: RotateCcw, color: 'text-cyan-400' },
  'negate': { Icon: Ban, color: 'text-red-400' },
  'destroy': { Icon: Bomb, color: 'text-red-500' },
  'discard': { Icon: Upload, color: 'text-muted-foreground' },
  'detach': { Icon: Circle, color: 'text-yellow-200' },
  'generic': { Icon: Play, color: 'text-muted-foreground' },
};

export function ActionIcon({ type }: { type: ComboAction['type'] }) {
  const { Icon, color } = icons[type];
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/80 border border-border">
      <Icon className={`w-5 h-5 ${color}`} />
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
