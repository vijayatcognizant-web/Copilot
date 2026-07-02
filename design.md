# Snip Design Language

Inspired by the visual feel of lovable.dev: dark, minimal, warm gradient glow,
pill-rounded hero input, generous breathing room.

---

## Tokens

### Colours

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0a0e` | Page background (near-black, slightly warm) |
| `--surface` | `#13131a` | Card / panel background |
| `--surface-border` | `rgba(255,255,255,0.07)` | Subtle card borders |
| `--text` | `#f0f0f6` | Primary body text |
| `--text-muted` | `#8080a0` | Labels, placeholders, secondary copy |
| `--accent-a` | `#ff6640` | Gradient start (coral) |
| `--accent-b` | `#ff3d8a` | Gradient end (pink) |
| `--success` | `#4ade80` | Success notices |
| `--error` | `#ff6060` | Error notices |
| `--link` | `#c084fc` | Table short-code links (soft violet) |

### Accent gradient

```css
background: linear-gradient(135deg, #ff6640, #ff3d8a);
```

### Hero glow (radial, behind hero section)

```css
background: radial-gradient(
  ellipse 80% 55% at 50% 0%,
  rgba(255, 80, 50, 0.22) 0%,
  rgba(255, 60, 140, 0.10) 45%,
  transparent 70%
);
```

---

## Typography

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| H1 hero | `clamp(2.8rem, 8vw, 4rem)` | 700 | Gradient text fill (white → coral) |
| Subtitle | `1rem` | 400 | `--text-muted` |
| Body / input | `0.95rem` | 400 | |
| Button | `0.875rem` | 600 | |
| Table body | `0.875rem` | 400 | |
| Section label | `0.75rem` | 600 | UPPERCASE, 0.09em letter-spacing |

**Font stack:** `system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`

---

## Spacing

- Page max-width: `680px`, centred, `1.5rem` side padding
- Hero top padding: `5.5rem`; bottom: `2.75rem`
- Card internal padding: `1.75rem`
- Table cell padding: `0.85rem 1.75rem`

---

## Shapes & Shadows

| Token | Value |
|-------|-------|
| `--r-card` | `20px` — cards, notices |
| `--r-pill` | `9999px` — input row, CTA button |
| Card shadow | `0 8px 40px rgba(0,0,0,0.45)` |
| Input focus ring | `0 0 0 3px rgba(255,80,50,0.10)` |

---

## Component Mapping

| Snip element | Design role |
|--------------|-------------|
| `<header.hero>` | Full-width hero with radial gradient glow behind it |
| `<h1>` | Bold centred headline, gradient text fill |
| `.subtitle` | Muted one-liner beneath the headline |
| `.form-card` | Dark surface card containing the hero input |
| `.input-row` | Chat-style pill row: text field + attached CTA button |
| `.notice--success` | Green-tinted inline result banner |
| `.notice--error` | Red-tinted inline error banner |
| `.links-card` | Rounded surface card; table rows separated by subtle borders |
