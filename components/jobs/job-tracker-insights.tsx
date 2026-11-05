"use client";
import { groupByEmployerSize, employerSizeDescriptions, employerSizeEntities } from "@/lib/job-employer-size";
import { groupByGovernment } from "@/lib/job-government";
import { groupByMission } from "@/lib/job-missions";
import { defaultMissionPreferences, groupByBroadMission, groupByEmployerIndustry, qualityReviewGroups, rangeContext, submissionRange, type MissionPreferences } from "@/lib/job-mission-summary";
import { interestReview } from "@/lib/job-review-queue";
import { useJobCategories } from "./job-category-context";
import { JobMissionPreferences } from "./job-mission-preferences";
import { useState } from "react";
import type { SerializedJobApplication as Job } from "@/lib/job-applications";
import {
  insights,
  applicationTimeline,
  groupJobs,
  outcome,
  roleCategory,
  sourceCategory,
} from "@/lib/job-tracker-insights";
function Bars({
  label,
  groups,
  chronological = false,
  descriptions,
  onSelect,
}: {
  label: string;
  chronological?: boolean;
  descriptions?: Record<string,string>;
  groups: [string, Job[]][];
  onSelect: (label: string, jobs: Job[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const orderedGroups = chronological ? groups : [...groups].sort(([a,left],[b,right])=>right.length-left.length||a.localeCompare(b));
  const visibleGroups = expanded ? orderedGroups : orderedGroups.slice(0, 8);
  const uniqueCount = new Set(groups.flatMap(([, jobs]) => jobs.map(job => job.id))).size;
  const max = Math.max(1, ...groups.map(([, j]) => j.length));
  return (
    <article className="ui-card-padded space-y-3">
      <h3 className="text-sm font-medium">{label}</h3>
      <p className="text-xs text-muted">{uniqueCount} unique applications · {groups.length} groups</p>
      <div className="space-y-3">
        {groups.length ? (
          visibleGroups.map(([key, jobs]) => (
            <button
              key={key}
              title={descriptions?.[key]}
              className="block min-h-10 w-full rounded text-start text-sm hover:bg-accent-cream/40 focus-visible:outline-2"
              aria-label={`Show applications — ${label}: ${key}${descriptions?.[key]?` (${descriptions[key]})`:""}, ${jobs.length}`}
              onClick={() => onSelect(`${label}: ${key}`, jobs)}
            >
              <span className="flex justify-between gap-3">
                <span className="min-w-0 break-words">{key}</span>
                <span>{jobs.length}</span>
              </span>
              <span className="mt-1 block h-3 rounded bg-accent-cream">
                <span
                  className="block h-3 rounded bg-foreground/60"
                  style={{ width: `${(jobs.length / max) * 100}%` }}
                />
              </span>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">No data in this range.</p>
        )}
      </div>
      {groups.length > 8 && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Showing {visibleGroups.length} of {groups.length}</span>
        <button className="ui-text-link min-h-10 text-sm" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : "Show all groups"}</button>
      </div>}
    </article>
  );
}
export function JobTrackerInsights({
  jobs,
  initialPreferences = defaultMissionPreferences,
  onPreferencesChange,
  today,
  onSelect,
  range: selectedRange,
  onRangeChange,
}: {
  jobs: Job[];
  initialPreferences?: MissionPreferences;
  onPreferencesChange?: (value:MissionPreferences)=>void;
  today: string;
  range: { from: string; to: string };
  onRangeChange: (range: { from: string; to: string }) => void;
  onSelect: (label: string, jobs: Job[]) => void;
}) {
  const categories = useJobCategories();
  const [preferences, setPreferences] = useState(initialPreferences);
  const { from, to } = selectedRange;
  const validRange =
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to;
  const setFrom = (from: string) => onRangeChange({ ...selectedRange, from });
  const setTo = (to: string) => onRangeChange({ ...selectedRange, to });
  const [sizeEntity,setSizeEntity]=useState("Hiring employer");
  const [period, setPeriod] = useState("daily");
  const [missionTrend, setMissionTrend] = useState("");
  const daysAgo = (days: number) => {
    const date = new Date(today + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };
  const range = validRange ? submissionRange(jobs, from, to) : [];
  const missionGroups = groupByBroadMission(range, categories);
  const allMissionGroups = groupByBroadMission(jobs, categories);
  const trendJobs = missionTrend ? (missionGroups.find(([label])=>label===missionTrend)?.[1]??[]) : range;
  const alignmentGroups = groupJobs(range, job => interestReview(job,preferences,categories).label);
  const data = insights(range, today);
  const due = jobs.filter(
    (j) =>
      j.status !== "ARCHIVED" &&
      !!j.trackerDetails.nextAction &&
      !!j.trackerDetails.dueDate &&
      j.trackerDetails.dueDate >= from &&
      j.trackerDetails.dueDate <= to &&
      j.trackerDetails.dueDate <= today,
  );
  const cards: [string, Job[]][] = [
    ["Confirmed in range", range],
    ["Awaiting response", data.awaiting],
    ["Interviews", data.interviews],
    ["Offers", data.offers],
    ["Follow-ups due in range", due],
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">Application summary</h2>
      <p className="text-sm text-muted">
        {from} – {to} · Local dates · Current recorded outcomes
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Date range shortcuts">
        {[
          ["Today", today],
          ["Past week", daysAgo(6)],
          ["Past month", daysAgo(29)],
        ].map(([label, start]) => (
          <button
            key={label}
            className="ui-input min-h-10 px-3 text-sm"
            aria-pressed={from === start && to === today}
            onClick={() => onRangeChange({ from: start, to: today })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs">
          From
          <input
            className="ui-input block min-h-10 px-3"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs">
          To
          <input
            className="ui-input block min-h-10 px-3"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Group by
          <select
            className="ui-input block min-h-10 px-3"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="daily">Day</option>
            <option value="weekly">Week</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, list]) => (
          <button
            disabled={!validRange}
            key={label}
            className="ui-card-padded text-start"
            onClick={() => onSelect(label, list)}
          >
            <span className="block text-2xl">{list.length}</span>
            <span className="text-xs text-muted">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Confirmed submissions only. Weeks start Monday. Historical submissions remain counted after rejection or withdrawal.
      </p>
      {validRange && <details className="ui-card-padded space-y-2">
        <summary className="cursor-pointer text-sm font-medium">Review data quality and records outside this range</summary>
        <p className="text-xs text-muted">Review counts use confirmed submissions in this range. The outside-range and unconfirmed links include all records. An empty category means zero tagged here, not “never applied.”</p>
        {[...qualityReviewGroups(range),...rangeContext(jobs,from,to)].map(([label,list])=><button key={label} className="flex min-h-10 w-full items-center justify-between gap-3 text-start text-sm ui-text-link" onClick={()=>onSelect(label,list)}><span>{label}</span><span>{list.length}</span></button>)}
      </details>}
      {!validRange ? (
        <p role="alert">Choose a start date and an end date on or after it.</p>
      ) : !range.length ? (
        <div className="ui-empty-state space-y-2">
          <p className="text-sm text-muted">
            No confirmed submissions in this range. Change the dates or review
            your unverified applications.
          </p>
          <button
            className="ui-text-link min-h-10 text-sm"
            onClick={() =>
              onSelect(
                "Unverified applications",
                jobs.filter((job) => !job.submissionConfirmed),
              )
            }
          >
            Review unverified applications
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs">Mission over time
              <select className="ui-input mt-1 min-h-10 w-full px-3" value={missionTrend} onChange={event => setMissionTrend(event.target.value)}>
                <option value="">All missions (unique applications)</option>
                {[...new Set([...allMissionGroups.map(([label]) => label), ...(missionTrend ? [missionTrend] : [])])].sort().map(label => <option key={label} value={label}>{label}</option>)}
              </select>
            </label>
            <Bars chronological label={`Applications over time${missionTrend ? `: ${missionTrend}` : ""}`} groups={applicationTimeline(trendJobs, from, to, period === "weekly")} onSelect={onSelect} />
          </div>
          {groupJobs(range,outcome).length===1 ? <button className="ui-card-padded min-h-10 text-start" onClick={()=>onSelect(`Recorded outcome: ${outcome(range[0])}`,range)}><span className="block text-sm font-medium">Recorded outcomes</span><span className="text-sm text-muted">{range.length} · {outcome(range[0])}</span></button> : <Bars label="Application outcomes" groups={groupJobs(range,outcome)} onSelect={onSelect}/> }
          <div className="space-y-3">
            <Bars label="Applications by mission group" groups={missionGroups} onSelect={onSelect} />
            <details className="space-y-2"><summary className="cursor-pointer min-h-10 text-sm">Narrow mission tags</summary><Bars label="Recorded mission tags" groups={groupByMission(range)} onSelect={onSelect}/></details>
            <p className="text-xs text-muted">Each application counts once in the confirmed total. Each broad group deduplicates its narrower tags; mixed missions can appear in multiple broad groups. Do not add groups together. Unknown includes company-only classifications. Change broad groups in Admin → Job categories.</p>
          </div>
          <div className="space-y-3">
            <Bars label="Mission preference alignment" groups={alignmentGroups} onSelect={onSelect}/>
            <p className="text-xs text-muted">Based on recorded missions and your editable interests, not a fit score. Exclusions take priority. Location (DC / US remote), salary ($100k minimum), and qualifications need separate review.</p>
            <details className="space-y-2"><summary className="cursor-pointer min-h-10 text-sm">Responses and decisions by interest</summary><p className="text-xs text-muted">Recorded stages only; invitations are not scheduled interviews. Your decision is separate from the employer’s outcome. No response rates are inferred.</p>{alignmentGroups.map(([tier,rows])=><div key={tier} className="space-y-1 border-t border-border-soft pt-2"><h4 className="text-sm font-medium">{tier} · {rows.length} unique confirmed</h4>{groupJobs(rows,outcome).map(([stage,list])=><button key={stage} className="ui-text-link min-h-10 block text-sm" onClick={()=>onSelect(`${tier}: ${stage}`,list)}>{stage} · {list.length}</button>)}{groupJobs(rows,job=>job.trackerDetails.searchDecision||"Decision not recorded").map(([decision,list])=><button key={decision} className="ui-text-link min-h-10 block text-xs" onClick={()=>onSelect(`${tier}: my decision — ${decision}`,list)}>My decision: {decision} · {list.length}</button>)}</div>)}</details>
            <JobMissionPreferences value={preferences} onSave={value=>{setPreferences(value);onPreferencesChange?.(value);}}/>
            <details><summary className="cursor-pointer min-h-10 text-sm">Why these alignments?</summary><ul className="divide-y divide-border-soft">{range.map(job=><li key={job.id} className="py-3 text-sm"><button className="ui-text-link min-h-10 text-start" onClick={()=>onSelect(`${job.company}: mission evidence`,[job])}>{job.company} · {job.title}</button><p>{interestReview(job,preferences,categories).label}: {interestReview(job,preferences,categories).reason}</p><p className="text-xs text-muted">{job.trackerDetails.missionEvidence || "No actual role/team mission evidence recorded."}</p></li>)}</ul></details>
          </div>
          <div className="space-y-3"><Bars label="Employer industry (company context)" groups={groupByEmployerIndustry(range)} onSelect={onSelect}/><p className="text-xs text-muted">Employer context is separate from the actual assignment. A staffing agency’s sector does not establish its client’s mission.</p></div>
          <details className="space-y-3 sm:col-span-2"><summary className="cursor-pointer min-h-10 text-sm font-medium">Roles, sources, and government breakdowns</summary><div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-xs">Employee count for<select className="ui-input mt-1 block min-h-10 w-full px-3" value={sizeEntity} onChange={e=>setSizeEntity(e.target.value)}>{employerSizeEntities.filter(v=>v!=="Unknown").map(v=><option key={v}>{v}</option>)}</select></label><Bars chronological descriptions={employerSizeDescriptions} label={`Applications by size: ${sizeEntity.toLowerCase()}`} groups={groupByEmployerSize(range,sizeEntity)} onSelect={onSelect}/><p className="text-xs text-muted">Unique confirmed applications in this date range, one band per application. Unknown includes missing size or a count recorded only for a different organization. Counts and checked dates are editable in job details.</p></div>
          <Bars label="Recruitment channel" groups={groupJobs(range,job=>job.trackerDetails.recruitmentChannel||"Unknown")} onSelect={onSelect}/>
          <Bars
            label="Applications by role"
            groups={groupJobs(range, roleCategory)}
            onSelect={onSelect}
          />
          <Bars label="Applications by government relationship" groups={groupByGovernment(range)} onSelect={onSelect} />
          <Bars
            label="Applications by source"
            groups={groupJobs(range, sourceCategory)}
            onSelect={onSelect}
          />
          </div></details>
        </div>
      )}
      <p className="text-xs text-muted">
        Role categories can be changed in job details.
      </p>
    </section>
  );
}
