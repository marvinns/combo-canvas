# Combo Canvas

Combo Canvas is a Vite + React app for writing card-combo lines and turning them into visual step breakdowns.

## Local development

```bash
npm install
npm run dev
```

## Temporary phone access

For a temporary public URL during development, run the app locally and expose it with Cloudflare Tunnel:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
cloudflared tunnel --protocol http2 --url http://localhost:5173
```

## Permanent deploy with GitHub Pages

This repo includes a GitHub Actions workflow that deploys the app to GitHub Pages on every push to `main`.

Expected site URL:

```text
https://marvinns.github.io/combo-canvas/
```

One-time GitHub setup:

1. Push the latest code to `main`.
2. Open the GitHub repo settings.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.

After that, every push to `main` will publish a new version automatically.

## Adding parser syntax

When you add a new combo sentence shape, update these three files together:

- [src/lib/comboParser.ts](/Users/marvin/combo-canvas/src/lib/comboParser.ts)
- [src/components/ComboStepVisual.tsx](/Users/marvin/combo-canvas/src/components/ComboStepVisual.tsx)
- [src/test/comboParser.test.ts](/Users/marvin/combo-canvas/src/test/comboParser.test.ts)

### 1. Add the parser rule

Start in `parseActivateEffectStep()` or the parser helper that already handles the closest existing syntax.

Add a new regex near similar patterns, and put the more specific rule before broader ones. Parser order matters: a generic match earlier in the file can swallow the line before your new rule gets a chance.

Return a `ComboAction` with the exact fields the visual needs:

```ts
return {
  type: 'activate',
  label: 'Activate',
  labels: ['Activate', 'Special Summon', 'Add to Hand'],
  sourceCard,
  sourceZone,
  targetCard,
  targetZone,
  followUpCard,
  followUpZone: 'hand',
  raw: trimmed,
};
```

What to pay attention to:

- `sourceCard` is the first card, the one causing the action.
- `targetCard` is the next card in the sequence.
- `followUpCard` is the later chained result if the step has a third card.
- `labels` drive most of the visual branching, so reuse existing labels exactly: `Activate`, `Special Summon`, `Add to Hand`, `Return`, `Banish`, `Reveal`, and so on.
- Prefer existing helpers like `normalizeZone()` and `findCardZone()` instead of duplicating zone logic.
- If the syntax uses shorthand like `ss`, make sure `expandSummonShorthand()` already expands it before parsing.

### 2. Add parser tests

In `src/test/comboParser.test.ts`, add at least one test for the full sentence and one for any shorthand or comma variant you want to support.

Example:

```ts
const [action] = parseCombo('Activate [A], ss [B] and add [C] to hand.');

expect(action.labels).toEqual(['Activate', 'Special Summon', 'Add to Hand']);
expect(action.sourceCard).toBe('A');
expect(action.targetCard).toBe('B');
expect(action.followUpCard).toBe('C');
expect(action.followUpZone).toBe('hand');
```

Test the exact structure the renderer depends on, not just that the parser returns something.

### 3. Add the visual branch

In `src/components/ComboStepVisual.tsx`, define a boolean that detects the new label combination:

```ts
const isActivateSummonAddStep =
  labelsToRender.includes('Activate') &&
  labelsToRender.includes('Special Summon') &&
  labelsToRender.includes('Add to Hand') &&
  Boolean(action.targetCard) &&
  Boolean(action.followUpCard);
```

Then add a dedicated render branch near similar compound-step branches.

Example shape:

```tsx
{isActivateSummonAddStep && action.targetCard && action.followUpCard && (
  <>
    <ActionArrow type="summon" />
    <CardDisplay
      name={action.targetCard}
      actionType="summon"
      statuses={['special-summon']}
    />
    <ActionIcon type="search" />
    <ActionArrow type="search" />
    <CardDisplay
      name={action.followUpCard}
      actionType="search"
      zone={action.followUpZone}
    />
  </>
)}
```

What to pay attention to:

- Reuse `ActionIcon`, `ActionArrow`, `CardDisplay`, and `SourceZoneBadge` instead of creating new UI pieces.
- The renderer mostly keys off `labels`, `targetCard`, `followUpCard`, and zones.
- If the middle card should show `SS` or another badge, pass the correct `statuses` prop.

### 4. Prevent collisions

This is the most common source of bugs.

Check both parser collisions and visual collisions:

- A broad parser regex earlier in the file may already match the new sentence.
- A generic visual condition may also match your new action and render the wrong layout.

If needed, tighten older branches so they skip the new syntax. Example:

```ts
!labelsToRender.includes('Add to Hand')
```

That kind of exclusion is often necessary when one compound step is a special case of another.

### 5. Verify the change

After editing parser, tests, and visual:

```bash
npm test -- --run src/test/comboParser.test.ts
npm run build
```

Quick final checklist:

- Does the parser return the right `labels`?
- Are `sourceCard`, `targetCard`, and `followUpCard` assigned correctly?
- Are zones correct?
- Is the generic visual fallback excluded when needed?
- Do shorthand variants like `ss` still work?
