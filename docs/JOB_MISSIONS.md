# Job field and mission classifications

`trackerDetails` has optional arrays `employerIndustries` and `missionFields`, separate evidence notes and HTTP(S) source links, and `classificationOrigin` (`manual` or `backfill`). Existing JSON defaults to empty arrays/Unknown. No schema migration is required; no legacy fields or material snapshots are rewritten.

The role/team mission is distinct from the employer's portfolio. Labels are editable, multiple labels and custom labels are supported, and clearing a manual classification remains authoritative. No live keyword classifier runs. Unknown missions require review; government employment or clearance alone never establishes defense. Explicit military/defense or defense-adjacent labels in either dimension show a current-preference conflict. This is a review prompt, not an automatic submission or status change. Location and suitability remain separate decisions.

Insights use confirmed submissions and their local submission calendar dates. A mixed job appears once in each mission category, but once in the unique confirmed total and the all-missions timeline. Category totals may exceed unique submissions. Empty labels form the Unknown category. The same date filters and chart-to-application interactions apply. Past week includes today and the previous six days; past month includes today and the previous 29 days.

## Conservative backfill rollout

Deploy the new JSON schema reader/writer before applying the data backfill. Older application versions do not recognize the new fields and can strip them when saving details. Do not backfill production while the old writer is serving traffic.

Preview with a private snapshot (no database connection or writes):

```sh
node --import tsx scripts/backfill-job-missions.ts --snapshot=/private/tmp/review.json
```

Or preview a scoped account against the configured database:

```sh
node --import tsx scripts/backfill-job-missions.ts --email=account@example.com
```

Only after rollout, apply the same reviewed rules:

```sh
node --import tsx scripts/backfill-job-missions.ts --email=account@example.com --apply
```

The script defaults to dry-run, requires an explicit account, locks that account's rows for the transaction, matches exact employer/title plus a specific saved evidence excerpt and a source link, skips existing/manual classifications, merges only new mission keys, verifies all original columns and existing detail fields are preserved, and checks confirmed totals before commit. Re-running is a no-op for classified records. Evidence-only rules are in `lib/job-mission-backfill.ts`; uncertain roles stay Unknown. No real account data or snapshots belong in git.

## Category management

Admin → Manage job categories (`/admin/job-categories`) manages the signed-in administrator's own tracker taxonomy. Categories are stored in an account-scoped `AppSetting`; no schema migration is needed. Used custom labels are included automatically. Add, rename, retire, and restore take effect without deployment. Retiring hides a suggestion and keeps historical labels/counts. Rename changes only that account's mission/industry label arrays, preserving original notes, statuses, submission dates, history, and materials. Stable category IDs preserve conflict flags; aliases resolve older editor labels so renamed categories are not silently reintroduced by stale tabs. Open tracker tabs should be refreshed after edits.

Charts show unique totals and a visible eight-group preview with an explicit Show all groups button, rather than an unlabeled internal scroll area.

## Government relationship

An independent editable `governmentRelationship` records federal, state/local, public institution, government-owned enterprise, contractor, non-government, international organization, or unknown. Its evidence/source and manual-origin marker are separate from mission labels. Government funding, USAJOBS publication, security clearance, and a DC address alone do not establish federal employment or defense work. Public universities, Smithsonian trust jobs, private-funded museum posts, and intergovernmental institutions need their own evidence. The chart partitions confirmed submissions once and shows zero-count relationship types; table columns and filters expose the same classification. No migration is required.
