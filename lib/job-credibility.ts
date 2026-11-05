import type {TrackerDetails} from "./job-tracker-details";
export const credibilityStatuses=["Not checked","Checked, no concerns found","Needs review","Red flags found"] as const;
export function credibilityConcern(details:TrackerDetails) {
  return details.credibilityCheck==="Needs review"||details.credibilityCheck==="Red flags found";
}

export function credibilityLabel(details:TrackerDetails) {return details.credibilityCheck==="Checked, no concerns found"?"No concerns found":details.credibilityCheck??"Not checked";}
