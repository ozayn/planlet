"use client";
import { useState } from "react";
import type { SerializedJobApplication as Job } from "@/lib/job-applications";
import { defaultMissionPreferences, type MissionPreferences } from "@/lib/job-mission-summary";
import { interestReview, practicalConstraints, reviewQueueGroup } from "@/lib/job-review-queue";
import { useJobCategories } from "./job-category-context";
import { missionSummary } from "@/lib/job-missions";
export function JobReviewQueue({jobs,preferences=defaultMissionPreferences,onSelect}:{jobs:Job[];preferences?:MissionPreferences;onSelect:(job:Job)=>void}) {
  const categories=useJobCategories();
  const [group,setGroup]=useState("Review next");
  const [tier,setTier]=useState("");
  const rows=jobs.filter(job=>reviewQueueGroup(job,preferences,categories)===group&&(!tier||interestReview(job,preferences,categories).label===tier)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return <section className="space-y-4">
    <h2 className="text-sm font-medium">Review opportunities</h2>
    <p className="text-sm text-muted">Review evidence before applying. Newest saved records first; record creation is not the original posting date. Ready requires recorded constraint and experience evidence. No applications or messages are sent here.</p>
    <div className="flex flex-wrap gap-3"><label className="text-xs">Queue<select className="ui-input mt-1 block min-h-10 px-3" value={group} onChange={e=>setGroup(e.target.value)}>{["Review next","Ready to apply","Needs input / blocked","Credibility review","Outside current preferences"].map(label=><option key={label}>{label}</option>)}</select></label><label className="text-xs">Interest tier<select className="ui-input mt-1 block min-h-10 px-3" value={tier} onChange={e=>setTier(e.target.value)}><option value="">All interests</option>{["Preferred","Adjacent","Other recorded missions","Excluded","Unknown / review needed"].map(v=><option key={v}>{v}</option>)}</select></label></div>
    <p className="text-xs text-muted">{rows.length} opportunities · Interest and demonstrated qualifications are separate.</p>
    {!rows.length&&<p className="ui-empty-state text-sm text-muted">No opportunities in this queue. Check another queue or review missing evidence in Applications.</p>}
    <ul className="space-y-3">{rows.map(job=><li key={job.id} className="ui-card-padded space-y-2 text-sm">
      <button className="ui-text-link min-h-10 text-start font-medium" onClick={()=>onSelect(job)}>{job.company} · {job.title}</button>
      {(job.trackerDetails.credibilityCheck==="Needs review"||job.trackerDetails.credibilityCheck==="Red flags found")&&<p className="text-accent-red">Credibility: {job.trackerDetails.credibilityCheck} · {job.trackerDetails.credibilityEvidence||"Review the listing, destination, and recruiter before proceeding."}</p>}
      <p>Interest: {interestReview(job,preferences,categories).label}{interestReview(job,preferences,categories).manual?" (manual)":" (proposed)"} · {interestReview(job,preferences,categories).reason}</p>
      <p className="text-xs text-muted">Organization: {(job.trackerDetails.employerIndustries??[]).join(" · ")||"Unknown"} · Actual work: {missionSummary(job.trackerDetails)}</p>
      <details><summary className="cursor-pointer min-h-10 text-sm">Constraints and evidence</summary><ul className="space-y-2">{practicalConstraints(job).map(c=><li key={c.label}>{c.label}: <strong>{c.state}</strong> · {c.reason}</li>)}</ul><p className="mt-3">Demonstrated experience: {job.trackerDetails.candidateEvidence||"Not yet recorded. Review relevant work, projects, and the scope of AI-assisted contributions."}</p>{job.trackerDetails.candidateEvidenceSource&&<a className="ui-text-link min-h-10 block" href={job.trackerDetails.candidateEvidenceSource} target="_blank" rel="noreferrer">Experience evidence</a>}<p>Gap / uncertainty: {job.trackerDetails.materialGap||job.trackerDetails.qualificationGaps||"Not yet assessed; interest is not proof of qualification."}</p>{job.trackerDetails.gapSource&&<a className="ui-text-link min-h-10 block" href={job.trackerDetails.gapSource} target="_blank" rel="noreferrer">Gap evidence</a>}{job.url&&<a className="ui-text-link min-h-10 block" href={job.url} target="_blank" rel="noreferrer">Review original posting / saved source</a>}</details>
      <p>My decision: {job.trackerDetails.searchDecision||"Not yet recorded"}{job.trackerDetails.decisionReason ? ` · ${job.trackerDetails.decisionReason}`:""}</p>
      <p>Next: {job.trackerDetails.blockerNote||job.trackerDetails.nextAction||(/\bUSER HOLD\b/i.test(job.notes??"")?job.notes?.slice(0,500):"")||(job.status==="SUBMISSION_FAILED"?"Review the failed submission attempt.":"Review the posting, constraints, and experience evidence.")}</p>
    </li>)}</ul>
  </section>;
}
