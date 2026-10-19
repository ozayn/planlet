# Life Areas (future feature)

**Status:** Not implemented. Design decisions only.

Life Areas are an optional way to view and reflect on plan tasks by life domain (for example Work, Health, Relationships). They must follow Planlet’s simplicity-first philosophy in [DESIGN_PHILOSOPHY.md](./DESIGN_PHILOSOPHY.md).

---

## Product intent

Help users optionally group tasks by life domain without turning Plans into a categorization chore.

Life Areas must never become mandatory setup before planning or focusing.

---

## Confirmed design decisions

1. **Optional alternative view in Plans**  
   Life Areas are a view mode (or filter), not a replacement for the default plan list.

2. **One primary Life Area per task**  
   Each task may have at most one primary area for rollups and summaries.

3. **Optional secondary Life Areas**  
   Secondary areas are allowed for soft tagging, but primary remains the source of truth for time and counts.

4. **Tasks can remain uncategorized**  
   No task requires a Life Area. Uncategorized is a valid, first-class state.

5. **No duplicate task display**  
   A task appears once in a given view. Secondary areas must not clone the same task into multiple list rows that look like separate work.

6. **No double-counting of time**  
   Focused time and completion stats attribute a task to its primary area only (or to uncategorized). Secondary areas do not inflate totals.

7. **Existing task creation remains unchanged**  
   Creating a task stays as it is today. Area assignment is optional and can happen later.

8. **Customizable areas without mandatory setup**  
   Provide a small set of sensible default area names users can rename, hide, or extend. Do not force an onboarding wizard.

9. **Deferred**  
   Weekly intentions and time-allocation goals for Life Areas are out of scope for the first implementation.

---

## Implementation constraints (when built)

- Reuse existing Plan / PlanItem models and patterns where possible.
- Prefer progressive disclosure for area pickers (not on every create form by default).
- Audit against DESIGN_PHILOSOPHY before shipping: defaults first, no required setup, mobile-first.
- Do not add speculative Settings pages for unused Life Area analytics.

---

## Explicitly out of scope for v1

- Required area assignment
- Multi-primary areas
- Automatic mandatory classification
- Weekly intention / time-budget UI
- Separate Life Areas home dashboard that duplicates Plans
