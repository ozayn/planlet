import type {TrackerDetails} from "./job-tracker-details";
export const vettingRequirements=["None stated","Public Trust or suitability investigation","Able to obtain security clearance","Active security clearance required","Unknown"] as const;
export function vettingReview(details:TrackerDetails):{state:"Met"|"Not met"|"Unknown";reason:string} {
  if(details.vettingRequirement==="Active security clearance required")return {state:"Not met",reason:"An active clearance is required; no active clearance is confirmed in the current evidence. This is a credential blocker, separate from mission."};
  if(details.vettingRequirement==="Able to obtain security clearance")return {state:"Unknown",reason:"Review obtainability and the stated level. Ability to apply for a new investigation is not a guarantee of adjudication; this is not an active-clearance requirement."};
  if(details.vettingRequirement==="Public Trust or suitability investigation")return {state:"Unknown",reason:"Review suitability requirements. Prior Public Trust for a different role is not a current national-security clearance or guaranteed approval."};
  if(details.vettingRequirement==="None stated"&&details.vettingEvidence&&details.vettingSource)return {state:"Met",reason:"No requirement stated in the reviewed posting; later employer vetting can still apply."};
  return {state:"Unknown",reason:"Vetting requirements have not been reviewed."};
}
