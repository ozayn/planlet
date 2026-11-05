import {vettingReview} from "./job-vetting";
import {credibilityConcern} from "./job-credibility";
import type { SerializedJobApplication as Job } from "./job-applications";
import type { JobCategory } from "./job-category-types";
import { actualMissions } from "./job-missions";
import { preferenceAlignment, type MissionPreferences } from "./job-mission-summary";
export type ConstraintResult = {label:string;state:"Met"|"Not met"|"Unknown";reason:string};
export function practicalConstraints(job:Job):ConstraintResult[] {
  const d=job.trackerDetails;
  let salary:ConstraintResult={label:"$100k base minimum",state:"Unknown",reason:"Annual USD base salary evidence is missing or the range crosses your minimum."};
  if(d.currency==="USD"&&d.payPeriod==="Year") {
    if(d.salaryMin&&Number(d.salaryMin)>=100000) salary={...salary,state:"Met",reason:"Published annual USD minimum is at least $100k; requested salary is not used."};
    else if(d.salaryMax&&Number(d.salaryMax)<100000) salary={...salary,state:"Not met",reason:"Published annual USD maximum is below $100k."};
  }
  const location:ConstraintResult={label:"DC / suitable US remote",state:d.locationEligibility&&d.locationEvidence ? d.locationEligibility : "Unknown",reason:d.locationEvidence||"Confirm the actual work location and US remote eligibility; Remote alone is not enough."};
  const excluded=actualMissions(d).some(v=>v==="Military / defense"||v==="Defense-adjacent");
  const defense:ConstraintResult={label:"No military / defense",state:excluded?"Not met":d.civilianScopeConfirmed&&d.missionEvidence?"Met":"Unknown",reason:excluded?"Recorded mission is military/defense or defense-adjacent.":d.civilianScopeConfirmed&&d.missionEvidence?"Civilian scope explicitly reviewed; government employment alone is not defense.":"Civilian scope has not been explicitly reviewed."};
  return [location,salary,defense,{label:"Clearance / vetting",...vettingReview(d)}];
}
export function interestReview(job:Job,preferences:MissionPreferences,categories:readonly JobCategory[]=[]) {
  const proposed=preferenceAlignment(job,preferences,categories);
  const d=job.trackerDetails;
  if(proposed.label==="Excluded")return {...proposed,manual:false};
  return d.interestTier ? {label:d.interestTier,reason:d.interestReason||"Manual interest tier; add your reason.",manual:true} : {...proposed,manual:false};
}
export function reviewQueueGroup(job:Job,preferences:MissionPreferences,categories:readonly JobCategory[]=[]) {
  if(job.status==="ARCHIVED")return null;
  if(job.submissionConfirmed)return credibilityConcern(job.trackerDetails)?"Credibility review":null;
  if(job.trackerDetails.searchDecision==="Not pursuing") return "Outside current preferences";
  if(job.trackerDetails.searchDecision==="On hold" || /\bUSER HOLD\b/i.test(job.notes??""))return "Needs input / blocked";
  if(job.status==="NEEDS_INPUT"||job.trackerDetails.blockerNote||job.trackerDetails.blockerType||job.status==="SUBMISSION_FAILED")return "Needs input / blocked";
  if(job.trackerDetails.vettingRequirement==="Active security clearance required")return "Needs input / blocked";
  if(credibilityConcern(job.trackerDetails))return "Credibility review";
  const constraints=practicalConstraints(job);
  if(constraints.some(c=>c.state==="Not met")||interestReview(job,preferences,categories).label==="Excluded") return "Outside current preferences";
  if(job.status==="READY_TO_SUBMIT"&&constraints.every(c=>c.state==="Met")&&job.trackerDetails.candidateEvidence&&job.trackerDetails.candidateEvidenceSource&&job.trackerDetails.credibilityCheck==="Checked, no concerns found"&&job.trackerDetails.credibilityEvidence&&job.trackerDetails.credibilitySources&&job.trackerDetails.credibilityCheckedDate) return "Ready to apply";
  return "Review next";
}
