# Life Lab YouTube Learning — Redundancy Audit

Audit date: July 2026  
Scope: `/life-lab/youtube-learning` browse page

## Summary

The browse page surfaced playlist **artifact** files as playlist cards, repeated unresolved-collection debug on every broken index, duplicated notes across Recently Added and Standalone videos, and buried useful standalone content under invalid cards. Fixes center on path-based classification, hiding unresolved collections from normal users, reordering sections, and stripping debug metadata from production UI.

**Root cause of playlist-artifact misclassification:** `isPlaylistIndexNote()` treated any file under `playlists/` as a playlist index. That included files under `playlists/assets/<playlist-id>/` (e.g. `playlist-learning-map.md`, `people-index.md`). The `-index.md` filename heuristic also matched artifact names like `people-index.md`.

---

## Section header

| | |
|---|---|
| **Current behavior** | Page title competed with “All sections” link and a text “Refresh” button in the header action row. |
| **Why redundant/confusing** | Two navigation affordances and a prominent refresh label drew attention away from content. |
| **Desired behavior** | Calm title + subtitle; “Back to Life Lab” as conventional back link; compact icon-only refresh with tooltip. |
| **Affected files** | `app/(app)/life-lab/[section]/page.tsx`, `components/life-lab/life-lab-refresh-button.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Search / sort / filter toolbar

| | |
|---|---|
| **Current behavior** | Search, sort select, and filters button appear together; filters open in a sheet; folder filter visible in dev. |
| **Why redundant/confusing** | Folder filter is developer-oriented; otherwise toolbar is reasonable. |
| **Desired behavior** | Compact row: Search · Sort · Filters (sheet, closed by default). Folder filter only in dev diagnostics. |
| **Affected files** | `components/life-lab/life-lab-section-browser.tsx`, `components/life-lab/life-lab-filter-panel.tsx` |
| **Fix status** | **Safe — folder filter already gated by `showDiagnostics`** |

---

## Recently added

| | |
|---|---|
| **Current behavior** | Up to 5 browseable notes (playlist or standalone), title + date only. |
| **Why redundant/confusing** | Previously capped at 3 inconsistently; could overlap with Standalone videos below. |
| **Desired behavior** | 3–5 compact rows: title + date, no card chrome, no tags/summaries. Notes shown here are excluded from lower-section previews. |
| **Affected files** | `lib/life-lab/section-view.ts`, `components/life-lab/life-lab-section-highlights.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Playlists

| | |
|---|---|
| **Current behavior (before)** | Artifact files (Concept Frequencies, People, Playlist Learning Map, README, etc.) rendered as playlist cards with “Collection folder not resolved” and raw counters. |
| **Why redundant/confusing** | Artifacts are not playlists; unresolved indexes repeated the same debug line; valid playlists were buried. |
| **Desired behavior** | Only resolved, valid playlist index records. Card: optional thumbnail, title, note count, last updated, optional pending progress. Whole card is a link with optional chevron. |
| **Affected files** | `lib/life-lab/file-classification.ts`, `lib/life-lab/playlist-index.ts`, `lib/life-lab/section-view.ts`, `components/life-lab/life-lab-playlist-card-list.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Standalone videos

| | |
|---|---|
| **Current behavior (before)** | Section appeared below long invalid playlist list; could repeat notes from Recently Added. |
| **Why redundant/confusing** | Useful content buried; duplicate rows on initial view. |
| **Desired behavior** | After Recently Added, before Playlists. 3–5 compact rows; “View all” when more exist; helper line only; hide when empty; exclude recent slugs from preview. |
| **Affected files** | `lib/life-lab/section-view.ts`, `components/life-lab/life-lab-standalone-videos.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Reference / Archive / About

| | |
|---|---|
| **Current behavior** | Collapsed disclosure groups; YouTube library groups use plain labels without “· N notes” in the summary. |
| **Why redundant/confusing** | Counts in headings add noise when sections are collapsed. |
| **Desired behavior** | Collapsed by default; headings: Reference, Archive, About YouTube Learning. |
| **Affected files** | `components/life-lab/life-lab-section-notes.tsx`, `lib/life-lab/organization.ts` |
| **Fix status** | **Safe — already matched for YouTube disclosure groups** |

---

## Refresh controls

| | |
|---|---|
| **Current behavior** | Icon + “Refresh” text in header; revalidates section cache on click. |
| **Why redundant/confusing** | Text label competes with page title. |
| **Desired behavior** | Small icon button with `sr-only` label and tooltip context. |
| **Affected files** | `components/life-lab/life-lab-refresh-button.tsx` |
| **Fix status** | **Safe — implemented (`compact` prop)** |

---

## Thumbnails

| | |
|---|---|
| **Current behavior (before)** | Large empty placeholder boxes on every playlist/standalone row without an image. |
| **Why redundant/confusing** | Empty media boxes add vertical bulk without information. |
| **Desired behavior** | Omit thumbnail when unavailable; show only when URL resolves. |
| **Affected files** | `components/life-lab/life-lab-playlist-card-list.tsx`, `components/life-lab/life-lab-standalone-videos.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Debug / developer metadata

| | |
|---|---|
| **Current behavior (before)** | Collection resolution, files/excluded counters, and unresolved labels on production cards. |
| **Why redundant/confusing** | Implementation language visible to normal users. |
| **Desired behavior** | Hidden in production. Single collapsed **Debug** panel for admin + development: listing diagnostics + unresolved playlist details. |
| **Affected files** | `app/(app)/life-lab/[section]/page.tsx`, `components/life-lab/life-lab-section-notes.tsx`, `lib/life-lab/section-view.ts` |
| **Fix status** | **Safe — implemented** |

---

## Playlist asset classification

| | |
|---|---|
| **Current behavior (before)** | Any `playlists/**/*.md` or `*-index.md` could become a playlist card. |
| **Why redundant/confusing** | Generated analysis files are not navigable playlists. |
| **Desired behavior** | `classifyLifeLabFile()` using full relative path: `playlist`, `playlistArtifact`, `standaloneVideo`, `reference`, `archive`, `about`, `internal`. Artifacts under `playlists/assets/` excluded from browse cards. |
| **Affected files** | `lib/life-lab/file-classification.ts`, `lib/life-lab/playlist-asset-paths.ts`, `lib/life-lab/playlist-index.ts` |
| **Fix status** | **Safe — implemented** |

### Classification rules (YouTube Learning)

| Role | Path / signal |
|------|----------------|
| `playlist` | Top-level `playlists/<name>.md` (not under `assets/`), not a known artifact filename; or `metadata.type === "playlist-index"` |
| `playlistArtifact` | `playlists/assets/<id>/<artifact>.md` or known artifact filename |
| `standaloneVideo` | `videos/` path, playable, no recognized external playlist |
| `playlistVideo` | Video assigned to a recognized playlist |
| `reference` | `channels.md`, `concepts.md`, `sources.md`, etc. |
| `archive` | `archive/` path |
| `about` | `README.md` |
| `internal` | Non-browseable processing/metadata |

---

## Duplicate note rendering

| | |
|---|---|
| **Current behavior (before)** | Same standalone note could appear in Recently Added and Standalone videos. |
| **Why redundant/confusing** | Same content twice on first paint. |
| **Desired behavior** | Dedupe by file ID → relative path → slug; exclude recent slugs from standalone preview and lower group previews. |
| **Affected files** | `lib/life-lab/section-view.ts`, `lib/life-lab/youtube-library.ts` |
| **Fix status** | **Safe — implemented** (content-hash dedupe deferred: summaries lack content hash at list time) |

---

## Mobile layout

| | |
|---|---|
| **Current behavior** | Responsive toolbar and single-column lists; thumbnails omitted when missing reduces scroll height. |
| **Why redundant/confusing** | Previously large empty thumbnails and long unresolved card list increased scroll. |
| **Desired behavior** | Full-width search; compact sort/filters; early standalone section; no debug for normal users. |
| **Affected files** | `components/life-lab/life-lab-section-browser.tsx`, card list components |
| **Fix status** | **Safe — improved via classification + thumbnail omission** |

---

## Unresolved collections

| | |
|---|---|
| **Current behavior (before)** | Broken playlist indexes shown as full cards with “Collection folder not resolved” and counters. |
| **Desired behavior** | Hidden from playlist cards for normal users; listed only in Debug with index path, folder attempt, resolution source, files found, excluded list. |
| **Affected files** | `lib/life-lab/section-view.ts`, `components/life-lab/life-lab-section-notes.tsx` |
| **Fix status** | **Safe — implemented** |

---

## Final page hierarchy

1. **YouTube Learning** header (back link + refresh icon)
2. Toolbar: Search · Newest/sort · Filters
3. Recently added (≤5)
4. Standalone videos (preview, before playlists)
5. Playlists (resolved only)
6. Reference ▸ · Archive ▸ · About YouTube Learning ▸
7. Debug ▸ (admin + development only)

---

## Intentionally deferred

- **Content-hash dedupe at browse time** — `LifeLabNoteSummary` has no content hash; slug is used as tertiary key. Full hash dedupe would require loading note bodies.
- **Continue learning block** — type exists in section view but is not populated for YouTube browse yet.
- **Search-results browse layout** — active query still uses flat grouped results (appropriate for search).
- **Playlist card progress when pending = 0** — progress line hidden unless pending > 0 on indexed playlists.
