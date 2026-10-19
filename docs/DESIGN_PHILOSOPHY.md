# Planlet Design Philosophy

This document is the default reference for all future UI, UX, and interaction work in Planlet.

Agents and contributors should audit UI changes against these principles before reporting completion.

Related docs: [BRANDING.md](./BRANDING.md), [PRODUCT_NOTES.md](./PRODUCT_NOTES.md), [UX_AUDIT.md](./UX_AUDIT.md), [MOBILE_AUDIT.md](./MOBILE_AUDIT.md), [LIFE_AREAS.md](./LIFE_AREAS.md).

---

## Purpose

Planlet is a thinking, learning, planning, and exploration environment.

**Planlet should make life easier to manage, not become another thing the user has to manage.**

The interface should help users focus on their work and understanding—not on configuring the application.

Every future UI change should be evaluated against these principles.

---

## Guiding north star: simplicity first

Prioritize effortless interactions, sensible defaults, minimal configuration, and calm, conventional interfaces.

This is a permanent product guideline, not a one-time redesign theme.

### Core principles

- **Simplicity over configurability** — prefer a calm default path over exposing every option
- **Sensible defaults over required setup** — users should succeed without configuring anything
- **One-click primary actions** — the main task should start with a single clear action
- **Progressive disclosure** — show only what is needed now; tuck the rest away
- **Optional categorization** — labels, areas, and tags must never be mandatory to use a feature
- **Minimal cognitive load** — every visible element competes with the user’s real work
- **Content before controls** — when content and chrome compete, prefer content
- **Information once** — never duplicate titles, filters, sources, or status
- **Automatic handling of repetitive operations** — remember, restore, and continue without ceremony
- **Conventional interactions** — use familiar patterns; do not invent clever new gestures
- **Easy recovery from mistakes** — pause, undo, stop, and exit should be obvious
- **Mobile-first accessibility** — readable text, generous touch targets, no horizontal scroll

### Three questions before shipping UI

Before introducing a **new setting**, ask:

> Could a sensible default eliminate the need for this setting?

Before introducing a **new control**, ask:

> Does the user need this control during their primary task?

Before introducing a **new feature**, ask:

> Can this reuse an existing interaction or component?

If the answer points toward removal or reuse, prefer that.

---

## 1. Content First

Content is the product.

The UI exists only to support reading, learning, planning, exploration, and reflection.

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

Do not turn primary feature pages into configuration dashboards.

---

## 6. Sensible Defaults and Settings

Avoid adding settings merely because something is configurable.

Only expose settings that provide meaningful user value.

Use:

- Sensible defaults that work without setup
- Compact categorized Settings pages
- Progressive disclosure inside Settings

Do not add empty or speculative settings pages.

Users should spend more time doing the work than configuring Planlet.

---

## 7. Reading Comes First (Life Lab)

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

## 8. Minimize Cognitive Load

Every visible UI element competes with learning and focus.

Before adding something, ask: does this help the user do the primary task?

If not, reconsider it.

---

## 9. Consistency

The same action should behave the same everywhere.

Examples that should share common components and patterns:

- Read Aloud
- Archive
- Flashcards
- Learning Maps
- More menus
- Reading modes
- Timers

Reuse existing interactions before inventing new ones.

---

## 10. Mobile Is the Primary Experience

Every screen should be designed mobile-first.

Desktop should expand the experience, not redefine it.

On mobile prioritize:

- Readable text
- Large enough touch targets
- Minimal navigation chrome
- No horizontal scrolling
- Primary actions immediately accessible
- Fewer steps to complete common tasks
- Cards that dominate the screen
- Drawers closed by default

---

## 11. Reading and Focus Should Feel Calm

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
- Configuration panels on primary screens

---

## 12. Easy Recovery

Users will pause, stop, leave, and return.

Support:

- Obvious Pause / Stop / Exit
- Restoring active sessions from timestamps
- Undoing or discarding short accidental sessions when appropriate
- No trapped modal flows for common tasks

---

## 13. Shared Components

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
- Circular timer ring

---

## Cursor / agent review checklist

Whenever UI is modified, perform this audit before completion:

1. Can anything be removed?
2. Is any information duplicated?
3. Does the content (or primary timer/task) occupy most of the screen?
4. Can secondary actions move into More or Settings?
5. Is the mobile experience clean (touch targets, no horizontal scroll)?
6. Is this component consistent with the rest of Planlet?
7. Does this reduce or increase cognitive load?
8. Could a sensible default eliminate a new setting?
9. Does the user need this control during the primary task?
10. Can this reuse an existing interaction or component?

If the answer suggests simplification, prefer the simpler solution.

---

## Applying this philosophy

- Prefer matching existing patterns in `components/life-lab/`, `components/ui/`, timers, and shared action menus over inventing new chrome.
- Keep workspace UI preferences in `.cursor/rules/planlet-ui.mdc` aligned with this document.
- Prefer gradual cleanup of older surfaces over large decorative rewrites.
- Record future-feature design decisions in docs (for example [LIFE_AREAS.md](./LIFE_AREAS.md)) before implementation.
