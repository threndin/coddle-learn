---
name: coddle-learn-design
description: >-
  Design bar for Coddle Learn UI and landing pages. Use when building,
  redesigning, or reviewing marketing pages, product UI, or visual polish for
  Coddle Learn. Enforces Coddle brand tokens, anti-generic SaaS patterns, and
  web3flutter-level interactivity.
---

# Coddle Learn Design

## Brand tokens (match coddle.dev)

| Token | Value |
|---|---|
| Primary | `#004CC8` |
| Primary deep | `#003A9E` |
| Primary light | `#5B9BFF` (accents on dark) |
| Dark navy | `#061833` (hero / dark sections) |
| Gradient | `linear-gradient(135deg, #004CC8 0%, #003A9E 100%)` |
| Soft glow | `#004CC8` at ~15% opacity, heavy blur |
| Surface | white / `#F8FAFC` |
| Ink | near-black slate |
| Muted | slate-500/600 |
| Font | Figtree (Coddle) + Geist Mono for labels |
| Radius | `rounded-xl` / `rounded-2xl` |
| Logo | `/logo.png` — always use the real mark |

## Bar

Coddle Learn must look **clearly better** than a standard SaaS template and **at least as integrative** as [web3flutter.dev](https://web3flutter.dev/): marquees, interactive explorers, drag/scroll showcases, live product visuals, purposeful motion.

## Hard bans (reject these)

- Generic 2×3 identical feature-card grids as the main idea
- Inter / Roboto / Arial / system as display
- Purple gradients, glow-for-glow’s-sake, emoji decoration
- Flat single-color backgrounds with no atmosphere
- Brand only in the nav — **Coddle Learn** must be hero-level
- Inset / carded hero media when the product visual should dominate
- Fake stats strips, pill clusters, icon rows as filler
- “Dashboard” mock that is just 3 gray boxes

## Composition rules

1. **One job per section.** One headline, one supporting line, one interaction.
2. **Hero budget:** brand, one headline (blue accent phrase ok), one sentence, one CTA group, one dominant product visual.
3. **Product visual must teach the product** — interactive roadmap graph, learning loop explorer, path board — not a stock photo or empty chrome.
4. **Motion:** ≥3 intentional motions (entrance, loop/marquee, hover/selection). Respect `prefers-reduced-motion`.
5. **Cards only when interaction needs a container.** Prefer borders, type, and layout first.
6. **Integrate:** clickable steps that swap panels, horizontal drag galleries, marquees, live node graphs.

## Landing section pattern (default)

1. Sticky header + logo
2. Hero + interactive product visual
3. Capability marquee
4. Interactive loop / explorer (stateful)
5. Path / ecosystem board (scroll-drag)
6. Open-source / contribute CTA (grid + glow)
7. Multi-column footer

## Review checklist

Before shipping UI:

- [ ] Would this still feel like Coddle if the logo were removed? (blue + Figtree + structure)
- [ ] Is there a non-generic interaction a visitor can play with in <5 seconds?
- [ ] Is the brand bigger than a nav wordmark?
- [ ] Any banned pattern present? Remove it.
