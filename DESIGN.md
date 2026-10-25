---
# Tokens are binding. Follows the Google Stitch DESIGN.md frontmatter shape,
# plus elan's `motion` and `direction` blocks.
name: "DT Lift"
direction:
  name: "Chalk & stencil: bumper plate"
  thesis: "A gym-wall poster you log on: cream paper, ink outlines, stencilled numbers and a red bumper plate."
  signature: "Completing a set spins its round check in like a plate loading onto the bar, then it presses flat into the page."
colors:
  background: "#F4EFE6"   # cream paper (Tailwind zinc-950 in this codebase, scale is inverted)
  surface: "#FFFDF8"      # card paper (zinc-900)
  surface-2: "#EFE8DA"    # chips, secondary buttons (zinc-850)
  ink: "#15111F"          # text, outlines, hard shadows (zinc-100 / zinc-800 border)
  muted: "#6B6458"        # secondary text (zinc-500), 4.9:1 on background
  accent: "#C93519"       # plate red: primary actions, accent text (lime-400), 4.7:1 on background
  accent-ink: "#FFFFFF"   # text on accent
  volt: "#D4FF3A"         # completion only: done sets, active nav, rest timer digits on ink
  danger: "#B42318"       # red-400
  success: "#D4FF3A"      # same as volt; always paired with a check glyph
  pr: "#8A5A00"           # personal records (amber-400)
typography:
  display: { family: "Stardos Stencil", weight: 700, tracking: "0", transform: "uppercase", leading: 0.92 }
  body: { family: "IBM Plex Sans Condensed", weight: 500, size: "16px", leading: 1.5 }
  mono: { family: "IBM Plex Mono", weight: 600 }
  scale: ["11px", "13px", "16px", "20px", "28px", "36px", "56px", "72px"]
rounded: { sm: "6px", md: "10px", lg: "14px", full: "999px" }
spacing: { unit: "4px", section: "24px", gutter: "16px" }
border: { slab: "2.5px solid ink", input: "2px solid ink" }
shadow: { slab: "4px 4px 0 ink", button: "3px 3px 0 ink", pressed: "0 0 0 ink + translate(3px,3px)" }
motion:
  intensity: crisp
  personality: "Physical and short: things stamp, press flat and spin onto the bar. Quick overshoot, never floaty."
  durations: { instant: "100ms", fast: "140ms", base: "220ms", slow: "340ms", scene: "500ms" }
  easing:
    out: "cubic-bezier(0.23, 1, 0.32, 1)"
    in-out: "cubic-bezier(0.77, 0, 0.175, 1)"
    stamp: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  spring: { stiffness: 500, damping: 28 }
  reduced: "No spin, slide or overshoot; colour and shadow changes stay instant."
components:
  slab: "Card. surface + slab border + slab shadow. Clickable slabs lift 1px on hover and press flat on active."
  btn-stamp: "Primary/destructive button. Ink border + button shadow; press translates 3px and the shadow collapses."
  plate-check: "Round set-complete toggle. Volt fill + check when done; spins in with the stamp easing."
  bottom-nav: "Paper bar with ink top rule. Active tab = volt tag with ink outline. Centre start button is a red plate."
  rest-card: "Ink card, volt stencil digits, red hard shadow."
---

# DT Lift

## Direction
A training poster pinned to a gym wall: cream paper, thick ink outlines, hard offset shadows, stencilled type, and one red bumper plate as the mark. It is loud and physical so logging a set feels like doing something. It is not glossy fitness-app dark mode, and not a neon-on-black "beast mode" look.

## Colour
- **Paper** (`background`, `surface`, `surface-2`) everywhere; cards are a shade lighter than the ground.
- **Ink** carries text, every outline and every shadow. Shadows are solid ink offsets, never blurred.
- **Plate red** is the one action colour: primary buttons, the start button, accent text, the selected state of filters.
- **Volt** only means *done*: completed sets, the active nav tab, rest digits. It never decorates.
- Implementation note: the codebase keeps Tailwind's `zinc-*`, `lime-*`, `red-*`, `amber-*` class names but `globals.css` remaps them. `zinc` is inverted (950 = paper, 100 = ink, 800 = ink outline), `lime` is plate red, `volt` is a new token.

## Type
- **Stardos Stencil**, uppercase, for page titles, exercise names, big numbers and the timer. Never for body copy or labels below 20px.
- **IBM Plex Sans Condensed** for everything readable.
- **IBM Plex Mono**, uppercase, 11px, letter-spaced, for labels and eyebrows; tabular numbers for weights and reps.

## Layout
Single column, max 32rem, 16px gutter, built for one hand at the gym. Every screen has one primary action, shown in plate red with a hard shadow. Cards stack with 12–16px gaps.

## Imagery
No photos. The bumper-plate mark, stencil type and solid shapes are the imagery. Everything is drawn in SVG (`public/brand/`).

## Motion
- **Signature:** completing a set → the plate check spins in (−120° → 0°, 340ms, stamp easing) and lands pressed flat.
- Buttons press flat: translate 3px + shadow collapse, 120ms. Clickable slabs lift 1px on hover (pointer devices only).
- Sheets slide up with the `out` easing; dialogs fade + scale from 0.96.
- The rest timer card doesn't pulse; its digits are the signal.
- Reduced motion: no spin or translate; state changes are instant.

## Components
See frontmatter. All shared classes live in `src/app/globals.css`; the mark is `src/components/Logo.tsx`.
