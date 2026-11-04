import { afterEach, expect, it, vi } from 'vitest';
import { searchYgoCards } from '@/lib/endboard';

afterEach(() => vi.unstubAllGlobals());

it('skips malformed card records without discarding valid search results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [
    {}, null, { name: 4 }, { name: '  Medius  ' }, { name: 'medius' }, { name: 'Nervedo' },
  ] }) }));
  expect(await searchYgoCards('Me')).toEqual([{ name: 'Medius' }, { name: 'Nervedo' }]);
});

it('handles failed searches without rejecting', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  expect(await searchYgoCards('Medius')).toEqual([]);
});

it('avoids remote lookup for empty or one-character searches', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  expect(await searchYgoCards(' ')).toEqual([]);
  expect(await searchYgoCards('a')).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});
