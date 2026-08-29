# Design system

Everything visual lives in `packages/ui`. A page in `apps/web` should be able to
be read end to end without a single hand-written colour, radius or shadow — if a
page needs one, the component is missing, not the page.

## The palette is blue, and so are the greys

The brand hue is **258** — a true blue, not an indigo and not a teal. `--primary`
is `oklch(0.55 0.21 258)` in light and `oklch(0.62 0.19 258)` in dark.

Every neutral carries a trace of that same hue (chroma 0.004–0.03) rather than
being a dead grey. Borders, muted text, page backgrounds and card surfaces all
sit in the same family as the primary. That is most of the difference between a
product that looks designed and one that looks like an unstyled default: with
neutral greys, a saturated blue button looks stuck on; with tinted ones, it
looks like it belongs.

**Pure black is never used.** The dark surface is `oklch(0.17 0.02 264)` — a deep
blue-slate. Pure black next to saturated blue makes the blue appear to vibrate,
and it is harsher to read on a phone at a counter in the evening.

Colours are oklch throughout, so the dark palette is derived by moving lightness
rather than by hand-picking a second set of hexes.

### Tokens worth knowing

| Token | For |
|---|---|
| `--primary` / `--primary-hover` | Buttons and links. Hover is a **darker token**, never `bg-primary/90` — an opacity hover over a tinted background goes milky and the button appears to fade rather than to press. |
| `--primary-subtle` / `--primary-subtle-foreground` | The lightest brand tint: active nav, selected rows, icon chips, soft badges. |
| `--success` / `--warning` / `--destructive` / `--info` | Domain status only — paid, low stock, cancelled. Never decoration. |
| `--shadow-xs … --shadow-lg` | Tinted with the brand hue rather than neutral black, which is what stops cards looking cut out and pasted on. |
| `.brand-wash` | The two-light gradient behind the auth panel, pricing card and CTA blocks. |
| `.grid-lines` | Masked grid for hero backgrounds. |
| `.tabular` | **Required** on every money and quantity cell. A rupee column that jitters looks broken. |

## Components

`PageHeader` / `PageBody` / `Section` exist because every screen opens the same
way — title, one line of what this page is for, primary action on the right.
Twenty pages each doing that by hand produces twenty slightly different headers,
which is the clearest single way to make a product look homemade.

Other rules that are easy to undo by accident:

- **Every button variant has an `active:` state.** On a phone there is no hover
  at all, so without a pressed state a tap gives no feedback and the shopkeeper
  taps again — which is how a bill gets saved twice.
- **Controls are `h-10`.** The primary user is billing one-handed with a customer
  waiting.
- **Focus does two things at once**: the border turns brand blue *and* a soft
  ring appears. Border alone is missable on a dense form; ring alone looks like a
  halo floating off the field.
- **Badges are soft** (tinted fill + matching ring), not solid blocks. A table row
  of solid red and green chips shouts over the numbers, which are what is
  actually being read.
- **`EmptyState` takes an icon and an action.** It is the first thing a new
  shopkeeper sees in every module, so it has to contain the button that creates
  the first record.
- **Long forms get a sticky action bar** (new invoice, product form). Nobody
  should hunt for "Save and issue" with a customer waiting.

## Nav is grouped, not a flat list

Eight flat links all look equally important, so the eye reads all eight every
time. Grouped into **Billing / Catalogue / Business** (plus **Billwise** for
super admins) the eye skips two thirds of the list. Groups are declared by
`section` on each `NavItem` and rendered in the order they first appear.

The active item gets a coloured bar at its edge as well as a fill: scanning a
list of eight, an edge is found faster than a slightly different background.

## Dark mode

Three-state — light / dark / system — stored in `localStorage` and applied by a
blocking inline script in `<head>` before first paint. React cannot do this: by
hydration the browser has already painted, and a dark-mode user would get a
white flash on every navigation.

That script is rendered **once**, in the root layout. A second copy inside a
nested layout is re-rendered on every client navigation, which React 19 refuses
to execute and logs as an error.

## What is deliberately not themed

`invoices/[id]/print/print.css` is hardcoded black on white with millimetre
sizing. A printed invoice is a legal document; it must not change because
somebody adjusted a design token, and it must not follow the reader's dark mode
into a black rectangle of toner.
