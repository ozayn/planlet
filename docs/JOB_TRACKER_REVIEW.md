# Job review and Insights

A confirmed submission is counted once by stored local submission date, including after rejection or withdrawal. Drafts, blocked attempts, failed attempts, and legacy applied dates are not evidence of submission. Selected range and review filters persist for the browser session and account.

## Three separate dimensions

- Employer industry describes the organization. For example, Smithsonian is a museum/education/research institution.
- Actual mission describes the work. Smithsonian bioinformatics remains science/research; enterprise content workflows are not museum assignments just because a customer portfolio includes museums.
- Recruitment channel describes whether an agency, direct employer, or referral is involved. Agency industry is not evidence of the client's mission. Company-only legacy tags remain unknown in mission comparisons.

Broad mission groups deduplicate related narrow tags. An application may appear in more than one group; the confirmed total remains distinct. Narrow tags/evidence remain editable, and Admin can change the broad-group mapping. Employer-context aliases are normalized for display without erasing historical classification evidence.

Preference alignment uses editable preferred/adjacent/excluded missions. Exclusions take priority; a manual tier and reason can refine other records. Organization interest, actual tasks, and demonstrated qualifications are separate. No numerical fit or response rate is inferred.

## Review queue

Existing workflow status, blockers, next actions, and qualification gaps drive the queue. Readiness requires explicit location evidence, annual USD published base salary at least $100k, reviewed civilian assignment scope, vetting review, relevant experience evidence, and a recorded credibility review with evidence/source/date. Unpublished pay, a range crossing the minimum, or Remote without location evidence stays unknown. Requested salary never proves published salary eligibility. Most legacy records will need evidence review before appearing ready; their saved notes and statuses remain intact. User holds remain in the input queue.

Clearance requirements are optional details: None stated, Public Trust/suitability, able to obtain, active clearance required, or Unknown, with level and source evidence. Only an active-clearance requirement is a present credential blocker on the current profile; obtainability and suitability need review. Neither establishes a defense mission.

An interview invitation is distinct from scheduling. Personal decisions (pursue, hold, not pursuing) do not change employer outcomes or formally withdraw applications. Review links expose missing mission, government, source and outcome evidence, plus confirmed records outside the range and unconfirmed records across all dates.

## Credibility review

Optional review status defaults to Not checked. Evidence covers the employer, specific listing/application destination, and recruiter identity; a receipt alone is not authenticity evidence. Needs review and Red flags show compact warnings, a list filter, and a separate pending review queue. No status, outcome, or confirmation is changed automatically, and no audit is implied for legacy records.

## Organization size

Optional approximate size is Small (1–50), Medium (51–500), Large (501+), or Unknown; charts expose boundaries in tooltips. Store the counted entity, source and checked date. The default chart and list filter use the hiring employer only, never silently substituting agency or parent size. Each confirmed application contributes to exactly one size band, including Unknown. No precise headcount is required.

## UX and validation

Quick add is collapsed, URL-first, and stays open for repeated entry. Secondary charts and evidence are progressively disclosed. Mission groups sort by count; the timeline stays chronological. Small viewports use cards instead of compressing a wide table. Pagination is a compact footer; dates do not wrap. Editor dismissal protects unsaved changes, Escape requests close, Tab stays within the sheet, and focus returns to the opener.

Regression coverage includes the confirmed Smithsonian October 7 receipt versus saved/archived records, museum mission versus institution context, local dates and inclusive boundaries, overlapping groups, company-only unknown missions, salary/remote uncertainty, blocked/failed attempts, invitations and later outcomes, and restored review state. No database schema migration is needed; new JSON fields default safely. Classification corrections keep prior labels/evidence in classificationHistory and update only reviewed fields with concurrency guards.
