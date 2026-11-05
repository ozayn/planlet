import type {SerializedJobApplication as Job} from "./job-applications";
export const employerSizeBands=["Small","Medium","Large","Unknown"] as const;
export const employerSizeDescriptions:Record<string,string>={Small:"1–50 employees",Medium:"51–500 employees",Large:"501+ employees",Unknown:"No verified size for the selected organization"};
export const employerSizeEntities=["Hiring employer","Recruiting intermediary","Parent organization","Unknown"] as const;
export function hiringEmployerSize(job:Job) {
  return job.trackerDetails.employerSizeEntity==="Hiring employer" ? job.trackerDetails.employerSizeBand??"Unknown" : "Unknown";
}
export function groupByEmployerSize(jobs:Job[],entity:string="Hiring employer"):[string,Job[]][] {
  const groups=new Map<string,Job[]>(employerSizeBands.map(band=>[band,[]]));
  for(const job of new Map(jobs.filter(j=>j.submissionConfirmed&&j.submittedDate).map(j=>[j.id,j])).values()) {
    const band=job.trackerDetails.employerSizeEntity===entity?job.trackerDetails.employerSizeBand??"Unknown":"Unknown";
    groups.get(groups.has(band)?band:"Unknown")!.push(job);
  }
  return [...groups];
}
