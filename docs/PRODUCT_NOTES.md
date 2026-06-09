# Planlet — Product Notes

## Product description

Planlet is a mobile-first planning app that turns Farsi/English daily, monthly, and yearly intentions into structured plans. It is not a full calendar replacement. It helps users create soft plans, track progress, and copy shareable updates for friends.

**Tagline:** A gentle planner for tasks, intentions, and the shape of your days.

## MVP scope

### In scope

- Google sign-in (Auth.js / NextAuth)
- Protected app shell with mobile bottom navigation
- Calm dashboard views: Today, Plans, Insights, Settings
- English UI with Farsi-friendly content input (RTL/LTR-safe display)
- PostgreSQL + Prisma data layer with auth tables
- PWA metadata (manifest, icons, install hints)
- Railway-ready deployment structure
- Centralized product naming in `config/product.ts`

### Out of scope (for now)

- AI-assisted planning or suggestions
- Audio capture or playback
- Google Calendar integration
- Complex analytics or charts
- Drag-and-drop planning
- Full calendar replacement features
- Shareable update copy/export flows (placeholder UI only)

## Design principles

- **Minimal** — only what supports daily planning
- **Conventional interactions** — familiar patterns, no novelty for its own sake
- **Reductive design** — remove before adding
- **Mobile-first** — thumb-friendly navigation and spacing
- **Google Keep-like lightness** — quick, calm, low friction (not a clone)
- **Calm dashboard** — soft surfaces, gentle typography, no urgency cues
- **No over-engineering** — ship the smallest useful version
- **User edits override AI** — when AI arrives, suggestions are never authoritative
- **Farsi-friendly content** — English UI; user content in Farsi, English, or mixed displays well with RTL/LTR-safe layout

## Future features

- Intention capture (text, and later voice)
- AI structuring of daily / monthly / yearly plans (user-editable)
- Progress tracking with soft completion states
- Copy-to-clipboard shareable updates for friends
- Plan templates and recurring rhythms
- Offline-friendly PWA caching
- Optional Google Calendar read-only sync
- Deeper insights (streaks, themes, gentle summaries)
- User language preference (EN / FA / mixed)
- Notification nudges (opt-in, calm tone)
