import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AnimatedGradientTextProps = {
  children: ReactNode;
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  speed?: number;
};

export function AnimatedGradientText({
  children,
  className,
  colorFrom = '#4ade80',
  colorTo = '#06b6d4',
  speed = 2,
}: AnimatedGradientTextProps) {
  return (
    <span
      className={cn('animated-gradient-title bg-clip-text text-transparent', className)}
      style={{
        ['--gradient-from' as string]: colorFrom,
        ['--gradient-to' as string]: colorTo,
        ['--gradient-speed' as string]: `${speed}s`,
      }}
    >
      {children}
    </span>
  );
}
