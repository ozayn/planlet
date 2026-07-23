# Planlet Design Philosophy

This document is the default reference for all future UI, UX, and interaction work in Planlet.

Agents and contributors should audit UI changes against these principles before reporting completion.

Related docs: [BRANDING.md](./BRANDING.md), [PRODUCT_NOTES.md](./PRODUCT_NOTES.md), [UX_AUDIT.md](./UX_AUDIT.md), [MOBILE_AUDIT.md](./MOBILE_AUDIT.md).

---

## Purpose

Planlet is a thinking, learning, and exploration environment.

The interface should help users focus on understanding content, not managing the application.

Every future UI change should be evaluated against these principles.

---

## 1. Content First

Content is the product.

The UI exists only to support reading, learning, exploration, and reflection.

When content and interface compete for attention, prefer the content.

---

## 2. When in Doubt, Remove

Adding UI should require justification.

Every label, divider, badge, icon, button, paragraph, tooltip, and control should earn its place.

If removing something makes the experience simpler without reducing understanding, remove it.

---

## 3. Interfaces Should Disappear

The best interface is one the user stops noticing.

After a feature is learned, persistent instructions should disappear.

Examples — do not permanently show:

- Tap to reveal answer
- Click here
- Swipe here
- Press Enter
- Obvious instructional hints

Teach interactions through:

- Consistency
- Affordance
- Subtle animation
- Sensible defaults

---

## 4. Every Piece of Information Appears Once

Avoid duplication.

If information is already communicated by route, page, section, title, artwork, filter, or metadata, do not repeat it elsewhere.

Examples — avoid stacking:

- BBC Daily Brief
- From BBC Daily Brief
- BBC
- Reading Brief

…when one clear representation is enough.

---

## 5. Progressive Disclosure

Show only what is needed now.

- Frequently used actions remain visible
- Occasional actions belong in More
- Rare configuration belongs in Settings

The default screen should be focused.

---

## 6. Reading Comes First

Life Lab is primarily a reading and exploration experience.

Pages should feel closer to Kindle, Apple Books, Notion, or Wikipedia than to dashboards.

Prioritize:

- Typography
- Spacing
- Illustrations
- Diagrams
- Reading comfort

…over controls.

---

## 7. Minimize Cognitive Load

Every visible UI element competes with learning.

Before adding something, ask: does this help the user understand the content?

If not, reconsider it.

---

## 8. Consistency

The same action should behave the same everywhere.

Examples that should share common components and patterns:

- Read Aloud
- Archive
- Flashcards
- Learning Maps
- More menus
- Reading modes

---

## 9. Mobile Is the Primary Experience

Every screen should be designed mobile-first.

Desktop should expand the experience, not redefine it.

On mobile:

- Cards dominate the screen
- Drawers are closed by default
- Controls are compact
- Touch targets are generous

---

## 10. Reading Should Feel Calm

Avoid visual noise.

Prefer:

- White space
- Few colors
- Minimal icons
- Soft hierarchy
- Clear typography

Avoid:

- Large toolbars
- Debug text
- Status messages
- Instructional paragraphs
- Repeated metadata

---

## 11. Exploration Before Configuration

Users should spend more time exploring ideas than configuring settings.

Settings should rarely interrupt reading.

---

## 12. Shared Components

Create reusable components for recurring interactions.

Avoid one-off implementations.

Examples:

- Read Aloud toolbar
- Archive action
- Learning card
- Timeline
- Diagram viewer
- Flashcards
- More menu

---

## Cursor / agent review checklist

Whenever UI is modified, perform this audit before completion:

1. Can anything be removed?
2. Is any information duplicated?
3. Does the content occupy most of the screen?
4. Can secondary actions move into More?
5. Is the mobile experience clean?
6. Is this component consistent with the rest of Planlet?
7. Does this reduce or increase cognitive load?

If the answer suggests simplification, prefer the simpler solution.

---

## Applying this philosophy

- Prefer matching existing patterns in `components/life-lab/`, `components/ui/`, and shared action menus over inventing new chrome.
- Keep workspace UI preferences in `.cursor/rules/planlet-ui.mdc` aligned with this document.
- Prefer gradual cleanup of older surfaces over large decorative rewrites.
