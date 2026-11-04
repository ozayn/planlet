# Job tracker and Insights

The tracker keeps quick add to URL, title and company. More details, filters,
column choices, materials, blockers and outreach use native disclosures and
standard form controls. The Applications / Insights switch stays on `/jobs`.

## Data and migration

`20261104120000_job_tracker_workflow` adds four workflow enum values and four
columns. It does not update or delete existing rows. Apply the migration before
running the new app code; generate the Prisma client as part of the normal build.
It has been applied to localhost only during development, not production.

- Existing statuses, `appliedDate`, creation/update timestamps, notes, salary text
  and URLs stay in place. Normalized URLs are a separate comparison key.
- Existing records start unverified. Neither an Applied label, an old default date,
  nor words in a note automatically establish a confirmed submission.
- Confirmation explicitly records a local calendar `submittedDate`, separately
  from creation and legacy applied dates. Saved/preparing/ready records become
  Applied on confirmation; unresolved blockers and failed attempts cannot be
  confirmed. Future submission dates are rejected.
- A successful confirmation is recorded once. Later rejection, withdrawal,
  archive, draft-material edits and retry statuses do not erase it or change its
  date. There are no automatic submissions or outbound messages.
- Validated optional job details live in `trackerDetails`. Empty structured salary
  means unknown; legacy salary prose is not converted into invented amounts.
- Server-controlled `trackerHistory` records transitions and a copy of the exact
  material version names and URLs at confirmation. Clients cannot replace this
  history. Row locks serialize concurrent history changes. Legacy history starts
  with a labelled baseline on first edit; earlier transitions are not invented.
- Snapshots preserve recorded version identifiers and links, not external file
  bytes. Use version-specific file URLs when the external storage supports them.
- Duplicate checks warn on normalized URLs, employer/job IDs and company/title
  matches, including archived records. Explicit “Save as separate role or repost”
  keeps both records. Unchanged identities do not trigger repeated warnings on
  later notes/status edits. No automatic merge or deletion occurs.

## Insights

From and To are inclusive local submission dates. All cards and charts use the
selected range; today/week/month cards additionally intersect their period with
that range. Weeks begin Monday. Follow-ups use action due dates and can include
unsubmitted jobs. They are not submission totals.

Each confirmed record contributes once. Outcome charts show currently recorded
outcomes; archive retains its last recorded substantive outcome when known.
Unknown legacy outcomes stay unclassified. No response/interview rates are
inferred. Chart bars and summary counts open matching applications, including
archived records. The selected Insights date range survives that navigation.

Role categories use simple title defaults with editable per-record overrides,
including custom labels. Source grouping preserves original source text and uses
the first recognizable named source when a source lists multiple channels;
posting URL is a fallback when source is empty. Unknown sources stay Other.

Missing qualifications is an optional multiline note (one skill or certificate
per line, with required/preferred context when known), a configurable table
column and a case-insensitive filter. It is kept separate from blockers and does
not prevent confirmation or assert that the applicant is unqualified. Older
records default to no recorded gaps; no database migration or inference is needed.

There are no required goals, streaks or volume targets.

## Verification

- `npm test` includes `lib/job-tracker.test.ts` for dates/timezones, confirmation
  totals, immutable snapshots, unknown salary, filters and grouping.
- `PLANLET_TEST_ADMIN_URL=<localhost URL> npx tsx scripts/test-job-tracker-db.ts`
  creates a uniquely named disposable database, applies the historical tracker
  migrations, seeds legacy fixtures, applies the additive migration, verifies
  preservation and exercises the actual service methods. It removes only that
  disposable database afterward. It never mutates the application database.
- The repository's full historical migration chain is not a clean-database
  bootstrap: an unrelated early migration expects an existing NotificationType.
  The integration harness therefore uses the actual tracker migrations with a
  minimal User table rather than pretending to verify unrelated migrations.
