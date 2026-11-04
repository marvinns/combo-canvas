import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useReducedMotion } from '@/hooks/useReducedMotion';

it('updates when the system motion preference changes and removes its listener', () => {
  let matches = false;
  const listeners = new Set<() => void>();
  const original = window.matchMedia;
  window.matchMedia = vi.fn(() => ({
    get matches() { return matches; },
    addEventListener: (_: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
  })) as unknown as typeof window.matchMedia;
  function Preference() { return <span>{useReducedMotion() ? 'Reduced' : 'Animated'}</span>; }
  try {
    const { unmount } = render(<Preference />);
    expect(screen.getByText('Animated')).toBeInTheDocument();
    act(() => { matches = true; listeners.forEach((listener) => listener()); });
    expect(screen.getByText('Reduced')).toBeInTheDocument();
    unmount();
    expect(listeners.size).toBe(0);
  } finally { window.matchMedia = original; }
});
