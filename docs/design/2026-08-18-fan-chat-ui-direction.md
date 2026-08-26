# Fan chat widget — UI/UX direction

Design pass for Task 11 of `docs/superpowers/specs/2026-08-18-realtime-fan-chat-design.md`.
Replaces the mock "Fan room" card at
`src/routes/(app)/artist/[slug]/+page.svelte:157-174`. Consumed by Task 12
(`ChatWidget.svelte`) — this file is direction, not code.

Produced with the `ui-ux-pro-max` skill (design-system pass + targeted `style`/`ux`
domain searches) as a sense-check against the codebase's own conventions, which take
precedence throughout: `src/styles/tokens.css`, `src/styles/themes/dark.css`, the
`.sidebar-card`/`.online-dot`/`.section-heading.compact` rules in the artist page, the
`MessageList.svelte` / `MessageComposer.svelte` visual language, and the existing
`skeleton-shimmer` convention in `ContentSkeleton.svelte`. Nothing here introduces a new
visual language — every surface, radius, spacing step, and color is one that already
exists in the app.

## 1. One widget, two states, one frame

Both states render inside the **same** `.sidebar-card` shell already used for "Fan room"
and "Latest shots" — same outer padding (`var(--space-5)`), same
`linear-gradient(135deg, rgba(255,255,255,.03), transparent 48%), color-mix(in srgb,
var(--bg-surface) 72%, var(--bg-primary))` background, same `box-shadow: 0 14px 44px
rgba(0,0,0,.18)`, same `border-radius: var(--radius-lg)`. Do not give the chat card a
different elevation or surface treatment than its sidebar sibling — it should read as
"another sidebar module," not a special widget bolted on.

The header (`.section-heading.compact`) is **identical structurally** between states —
same eyebrow/title on the left, same right-aligned presence cluster showing the _real_
`onlineCount`/`artistOnline` from `src/lib/server/chat/presence.ts` in both cases. Only
the body below the header differs. This matters for the teaser's credibility: a
non-subscriber must see the room is actually alive (real numbers, real artist presence)
even though the messages themselves are withheld — that's the entire point of the
teaser as a conversion surface.

Fixed body height in both states so switching between them (e.g. right after a
subscribe action resolves) never reflows the sidebar: `min-height: clamp(280px, 40vw,
360px)` on the body region, independent of how many skeleton/message rows are inside it.

## 2. Shared header — presence cluster

Current mock: a single `.online-dot` (10px circle, `--success`, soft ring via
`color-mix`). Keep the dot exactly as-is — don't reinvent the primitive — but give it a
label and a second, conditional badge next to it, replacing the bare dot:

```
[Community]                          ● 128 online   [Artist here]
Fan room
```

- **Online count** — dot + `<span>` text, e.g. `128 online`. Reuse
  `.section-heading` typography (`--font-size-xs`/`--text-secondary` weight, matching
  `.eyebrow`'s scale so it doesn't compete with the `h2`). Render the digits in
  `font-variant-numeric: tabular-nums` so the pill doesn't jitter in width as the count
  ticks (128 → 129 → 97 …) between renders.
- **"Artist here" badge** — only rendered when `artistOnline` is `true`. Small pill,
  visually built the same way `.artist-badge` already is in `MessageList.svelte`
  (`background: color-mix(in srgb, var(--primary) 22%, transparent); color:
var(--primary); font-weight: 700; font-size: 10px; text-transform: uppercase;
border-radius: 999px`). This is a direct reuse of a rule that already exists for
  exactly this purpose (marking the artist's own messages) — extending it to a presence
  badge keeps "primary-tinted pill = this is the artist" a single visual idiom across
  the widget instead of inventing a second one.
- **Layout**: `display: flex; align-items: center; gap: var(--space-2);` on the
  cluster, right-aligned in `.section-heading.compact` exactly like today's lone dot.

### Motion — presence dot

Keep the dot's steady-state look exactly as today (solid `--success` fill + static
`box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 18%, transparent)` ring). Do
**not** make it pulse continuously — the `ui-ux-pro-max` `ux` pass flags exactly this
("Continuous Animation … use for loading indicators only, don't use for decorative
elements," severity Medium) and a chat sidebar module that breathes forever next to
static content is the kind of ambient motion that gets distracting fast in a page
where it sits for the whole session.

Instead, animate **only on transition**:

- `onlineCount` changes → the digits crossfade (`opacity` 0→1 over
  `var(--duration-fast)` `var(--easing-ease-out)`, old value fades out over the same
  duration) rather than snapping or sliding — a numeric tick, not a layout move.
- `artistOnline` flips `false → true` → the "Artist here" badge enters with a single
  scale+fade (`transform: scale(0.9) → scale(1)`, `opacity: 0 → 1`,
  `var(--duration-normal)` `var(--easing-ease-out)`) and the dot does **one** brief
  double-pulse (two ring expansions, ~`var(--duration-slow)` each, using the same
  `--success` ring color at increasing `color-mix` transparency) to draw the eye once,
  then settles back to the static ring. This is the "cause → effect" motion the skill's
  `motion-meaning` rule asks for: the pulse _means_ "the artist just joined," it isn't
  ambient decoration.
- `artistOnline` flips `true → false` → badge exits with a fade only (no scale, exits
  are shorter than entries — `var(--duration-fast)`), dot returns to static state with
  no pulse (leaving is not the moment to draw attention).
- Wrap all of the above in `@media (prefers-reduced-motion: no-preference)`; under
  reduced motion, state changes still happen but as instant swaps — no crossfade, no
  scale, no pulse ring.

## 3. Subscriber view — live room

Body layout, top to bottom, inside the shared `min-height` region:

1. **Message list** — `MessageList.svelte` unmodified, mounted in a scroll container:
   `max-height: clamp(260px, 40vw, 340px); overflow-y: auto; overscroll-behavior:
contain;` with a slim scrollbar treatment consistent with a dark surface
   (`scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--border-primary)
70%, transparent) transparent` for Firefox, `::-webkit-scrollbar { width: 6px }`
   thumb in the same color, for WebKit). `margin-top: var(--space-3)` below the header,
   matching the mock's existing `.chat-preview` spacing.
2. **Composer** — `MessageComposer.svelte` unmodified, pinned directly below the
   scroll container, separated by a hairline: `border-top: 1px solid color-mix(in srgb,
var(--border-primary) 40%, transparent); margin-top: var(--space-3); padding-top:
var(--space-3);`. This is the same hairline weight the composer already implicitly
   assumes elsewhere (its own `textarea` border uses `color-mix(... 62%, transparent)`
   at higher opacity — the container-level divider should read as quieter than the
   input itself, hence 40% not 62%).
3. **Empty state** (room has zero messages yet) — replace the list with a single
   centered block reusing the app's existing `.empty-state` idiom from the same page
   (dashed border, `color-mix(in srgb, var(--bg-surface) 46%, transparent)` fill,
   `--text-secondary`), scaled down for the sidebar: `padding: var(--space-5);
font-size: var(--font-size-sm);`, icon (`SvgIcon` with `mdiChatOutline`, 20px,
   `--text-tertiary`) above one line of copy: "No messages yet — be the first to say
   hi." No emoji, per the icon-consistency rule the design pass surfaced — the page
   already uses `@mdi/js` paths everywhere via `SvgIcon`, this is the one icon set.

### New-message arrival (subscriber)

When a message streams in and the viewer is scrolled to the bottom, the row enters via
the same list-entrance motion already implied by `MessageList`'s `gap`-based flex
layout: fade+slight-rise (`opacity 0→1`, `transform: translateY(6px) → translateY(0)`,
`var(--duration-normal)` `var(--easing-ease-out)`), one row at a time — never a batch
pop. If the viewer has scrolled up to read history, do **not** auto-scroll or animate
the new row into view; surface a small pill anchored to the bottom of the scroll
container instead (`N new` on a `--primary`-tinted pill, same visual family as the
"Artist here" badge), which on click scrolls to bottom. This is a UX-level note for
Task 12's implementation, not a visual it needs new tokens for — it reuses the badge
styling already specified above.

## 4. Non-subscriber teaser — same header, gated body

### What must never happen (data contract, not just visual)

The blur/obscure treatment is a **presentation** layer over placeholder content — it
must never be a CSS mask over the _real_ message body. A non-subscribed client must not
receive real message text or author identity at all (not even blurred): `backdrop-
filter: blur()` on real DOM content is trivially defeated (dev tools, view-source,
screen readers still read the underlying text node, browser zoom can un-blur small
`blur()` radii). Task 12 and the server contract behind it should treat "new message
in a gated room" as a content-free event for non-subscribers — e.g. a bare tick/counter
— and the widget renders **synthetic placeholder rows**, not the real payload run
through CSS blur. This keeps the entitlement boundary a data boundary (consistent with
how gating already works elsewhere per the `subscription-13` design), not a purely
visual one that a curious viewer could peel back.

### Placeholder rows

Reuse the exact shimmer technique already established in
`src/routes/(app)/artist/[slug]/components/ContentSkeleton.svelte` rather than
inventing a second skeleton language for this one card:

```css
background: linear-gradient(
	90deg,
	color-mix(in srgb, var(--bg-surface) 70%, transparent) 25%,
	color-mix(in srgb, var(--bg-tertiary) 90%, transparent) 50%,
	color-mix(in srgb, var(--bg-surface) 70%, transparent) 75%
);
background-size: 200% 100%;
animation: skeleton-shimmer 1.4s ease-in-out infinite;
```

Render 5–6 rows shaped like `MessageList`'s real rows (small circular avatar skeleton +
one or two text-bar skeletons of varied width — alternate roughly 70%/45% so the
stack doesn't look like a uniform ladder), at the same row height/gap
(`var(--space-3)` between rows, matching `.message-list`'s `gap`) so the teaser and the
real list occupy visually identical rhythm — a subscriber and non-subscriber looking at
screenshots of the same room should see the same shape, just one solid and one
shimmering.

`aria-hidden="true"` on the skeleton rows (as `ContentSkeleton.svelte` already does) —
they carry no information a screen reader should announce; the CTA below is the
actionable content for that audience.

Respect `prefers-reduced-motion`: freeze the shimmer to its midpoint frame
(`animation: none; background-position: 0 0;`) rather than looping — this is a gap the
existing `ContentSkeleton.svelte` also doesn't yet cover, worth fixing there too when
Task 12 touches this pattern, but at minimum the new chat skeleton should not regress
further.

### Arrival reaction (teaser)

On the content-free "a message just landed" event, insert **one new skeleton row** at
the position a real row would appear (bottom of the stack, oldest rows scroll off the
top if the stack is at capacity — cap at 6 visible rows, same as the mock's
`Array(6)`). The new row's entrance is the signal that the room is alive in real time:

- Enter with fade + rise, identical timing to the subscriber row-entrance
  (`translateY(6px) → 0`, opacity 0→1, `var(--duration-normal)` ease-out) so the two
  states share one motion vocabulary.
- Additionally, on entry only, the row briefly carries a `--primary`-tinted highlight
  sweep instead of jumping straight into the shimmer — background starts at
  `color-mix(in srgb, var(--primary) 14%, transparent)` and eases to the normal
  shimmer gradient over `var(--duration-slow)`. This is the one place the teaser is
  allowed a slightly richer flourish than the subscriber view, because for a
  non-subscriber this row _is_ the product demo — it's the moment that's supposed to
  make the $1/mo subscribe feel worth it ("something is happening in there right now
  and I can't see it").
- Cap this flourish to the newly-inserted row only — never re-trigger it on rows
  already present, and never loop it independently of real arrival events (ties back to
  the same "continuous animation only for loading" rule from §2).

### Subscribe CTA

Placed below the skeleton stack, inside the same card (not a separate card) so the CTA
reads as "unlock this specific room" rather than a generic upsell:

- `padding-top: var(--space-4); border-top: 1px solid color-mix(in srgb,
var(--border-primary) 40%, transparent);` — same hairline weight as the subscriber
  view's composer divider, so the two states' internal seams feel like the same design
  system even though what's above the seam differs.
- One line of copy, e.g. "Subscribe to join the fan room" (`--text-secondary`,
  `--font-size-sm`), then the existing `Button` primitive at default (primary) variant
  with the same `Subscribe · $1/mo` label already used in the hero CTA — do not
  introduce a second subscribe copy/label variant, reuse the one on the page verbatim
  so the price and verb are consistent wherever a viewer encounters them.
- This is the card's only interactive element in the teaser state — no skeleton row,
  composer-shaped placeholder, or like/menu affordance should look clickable
  (`cursor: default` on the skeleton stack, no hover states on it at all), so the single
  real button doesn't compete with fake ones.

## 5. Responsive behavior

No new breakpoints — the widget lives inside `.side-content`, which already collapses
to `position: static` in the existing `@media (max-width: 1100px)` block and the whole
grid drops to one column. At `max-width: 720px` the card radius already steps down to
`var(--radius-md)` with the other sidebar cards; the chat widget should follow that
same rule rather than keep `--radius-lg` on mobile.

## 6. New tokens to add

Following the existing `--gate-*`/`--upload-*`/`--status-*` naming precedent already in
`src/styles/tokens.css` (added for the studio-music-upload work), add a `--chat-*`
group rather than hardcoding one-off values in the component:

```css
:root {
	--chat-presence-ring: color-mix(in srgb, var(--success) 18%, transparent);
	--chat-artist-badge-bg: color-mix(in srgb, var(--primary) 22%, transparent);
	--chat-artist-badge-text: var(--primary);
	--chat-divider: color-mix(in srgb, var(--border-primary) 40%, transparent);
	--chat-arrival-tint: color-mix(in srgb, var(--primary) 14%, transparent);
	--chat-new-pill-bg: var(--chat-artist-badge-bg);
}
```

(`--chat-artist-badge-*` and `--chat-new-pill-bg` intentionally alias the same
`--primary`-tinted pill treatment described in §2/§3 — one token pair, reused by both
the presence badge and the "N new" scroll pill, rather than two near-identical
definitions drifting apart later.)

## 7. Handoff summary for Task 12

- Mount inside the existing `.sidebar-card`; do not change that shell's padding,
  background, shadow, or radius rules.
- Header stays `.section-heading.compact` structurally; swap the bare `.online-dot`
  for the dot + tabular-nums count + conditional "Artist here" badge described in §2.
  Drive both from the real `PresenceSnapshot` (`onlineCount`, `artistOnline`) in both
  states.
- Subscriber body = `MessageList` in a scroll container + `MessageComposer` pinned
  below a hairline, per §3. Empty state reuses the page's own `.empty-state` visual,
  scaled down.
- Teaser body = synthetic shimmer rows (reusing `ContentSkeleton.svelte`'s exact
  gradient/animation), capped at 6, `aria-hidden`, non-interactive, with the one-row
  arrival flourish in §4 — never rendering real message content to a non-subscriber,
  even blurred.
- Subscribe CTA reuses the page's existing `Button`/copy verbatim.
- All motion gated behind `prefers-reduced-motion: no-preference`; all new durations
  drawn from existing `--duration-*`/`--easing-*` tokens, no new timing values.
- Add the `--chat-*` token group from §6 to `src/styles/tokens.css` rather than
  hardcoding colors in the component's `<style>` block.
