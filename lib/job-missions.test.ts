import { governmentLabel, groupByGovernment } from "./job-government";
import { missionBackfillPatch } from "./job-mission-backfill";
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyTrackerDetails, trackerDetailsSchema } from "./job-tracker-details";
import { missionReview, groupByMission } from "./job-missions";
import { emptyJobFilters, matchesJobFilters } from "./job-tracker-filters";
import { applicationTimeline } from "./job-tracker-insights";
import type { SerializedJobApplication as Job } from "./job-applications";
function job(id: string, missions: string[], overrides: Partial<Job> = {}): Job {
  return {id, title: "Engineer", company: "Mixed portfolio", url:null, description:null, summary:null, source:null, referrer:null, location:null, salary:null, appliedDate:null, status:"APPLIED", notes:"Preserve me", createdAt:"2026-11-01T00:00:00Z", updatedAt:"2026-11-01T00:00:00Z", trackerDetails:{...emptyTrackerDetails(),missionFields:missions}, trackerHistory:[], submissionConfirmed:true, submittedDate:"2026-11-04", ...overrides};
}
test("old details safely default to unknown without losing existing fields", () => {
 const d=trackerDetailsSchema.parse({blockerNote:"Login needed",resumeVersion:"submitted.pdf"});
 assert.deepEqual(d.missionFields,[]); assert.deepEqual(d.employerIndustries,[]);
 assert.equal(d.blockerNote,"Login needed"); assert.equal(d.resumeVersion,"submitted.pdf");
 assert.equal(missionReview(d),"Mission needs review");
});
test("mixed-portfolio, government and clearance alone do not establish a defense mission", () => {
 const d={...emptyTrackerDetails(),employerIndustries:["Government / public policy"],missionEvidence:"Public Trust required"};
 assert.equal(missionReview(d),"Mission needs review");
 assert.equal(missionReview({...d,missionFields:["Healthcare"]}),"Mission recorded");
 assert.equal(missionReview({...d,missionFields:["Healthcare","Defense-adjacent"]}),"Mission conflict");
 assert.equal(missionReview({...d,employerIndustries:["Military / defense"]}),"Mission conflict");
});
test("multi-label counts retain unique jobs per category and exclude all unconfirmed states", () => {
 const mixed=job("mixed",["Healthcare","Education / learning","Healthcare"]);
 const unknown=job("unknown",[]);
 const ignored=["SAVED","PREPARING","NEEDS_INPUT","SUBMISSION_FAILED","APPLIED"].map((status,i)=>job(String(i),["Healthcare"],{status:status as Job['status'],submissionConfirmed:false,submittedDate:null}));
 const groups=groupByMission([mixed,mixed,unknown,...ignored]);
 assert.deepEqual(groups.map(([label,jobs])=>[label,jobs.length]),[["Education / learning",1],["Healthcare",1],["Unknown",1]]);
 assert.equal(mixed.notes,"Preserve me");
 assert.equal(applicationTimeline([mixed],"2026-11-03","2026-11-05").reduce((n,[,rows])=>n+rows.length,0),1);
});
test("mission, industry and review filters use stored labels including manual custom corrections", () => {
 const j=job("custom",["My custom mission"],{trackerDetails:{...emptyTrackerDetails(),classificationOrigin:"manual",missionFields:["My custom mission"],employerIndustries:["Technology"]}});
 const matches=(patch: Partial<ReturnType<typeof emptyJobFilters>>) => matchesJobFilters(j,"EVERYTHING","all",{...emptyJobFilters(),...patch},"2026-11-05");
 assert.equal(matches({mission:"My custom mission",industry:"Technology"}),true);
 assert.equal(matches({mission:"Unknown"}),false);
 assert.equal(matches({missionReview:"Mission recorded"}),true);
 assert.equal(matches({mission:"Military / defense"}),false);
 assert.equal(j.trackerDetails.classificationOrigin,"manual");
});

test("curated backfill requires exact role, saved evidence and a source, and never overwrites manual corrections", () => {
 const base={company:"ACT",title:"Data Scientist II, 35487f31",url:"https://example.org/job",description:"Student college/career recommendations",notes:null,trackerDetails:{blockerNote:"Keep this"}};
 const patch=missionBackfillPatch(base);
 assert.deepEqual(patch?.missionFields,["Education / learning"]);
 assert.equal(base.trackerDetails.blockerNote,"Keep this");
 assert.equal(missionBackfillPatch({...base,description:""}),null);
 assert.equal(missionBackfillPatch({...base,title:"Different role"}),null);
 assert.equal(missionBackfillPatch({...base,url:null}),null);
 assert.equal(missionBackfillPatch({...base,trackerDetails:{classificationOrigin:"manual",missionFields:[]}}),null);
 assert.equal(missionBackfillPatch({...base,trackerDetails:{missionFields:["Other"]}}),null);
 assert.equal(missionBackfillPatch({...base,trackerDetails:patch}),null);
});

test("government relationship is independent of mission, defaults to unknown and filters explicitly", () => {
 const legacy=job("legacy",["Government / public policy"]);
 assert.equal(governmentLabel(legacy.trackerDetails),"Unknown");
 const contractor=job("contract",["Healthcare"],{trackerDetails:{...emptyTrackerDetails(),missionFields:["Healthcare"],governmentRelationship:"CONTRACTOR"}});
 assert.equal(governmentLabel(contractor.trackerDetails),"Government contractor");
 assert.equal(missionReview(contractor.trackerDetails),"Mission recorded");
 assert.equal(matchesJobFilters(contractor,"EVERYTHING","all",{...emptyJobFilters(),government:"CONTRACTOR"},"2026-11-05"),true);
 assert.equal(matchesJobFilters(contractor,"EVERYTHING","all",{...emptyJobFilters(),government:"FEDERAL"},"2026-11-05"),false);
 const groups=groupByGovernment([contractor,contractor,legacy,job("draft",[],{submissionConfirmed:false,submittedDate:null})]);
 assert.equal(groups.length,8);
 assert.equal(groups.reduce((total,[,rows])=>total+rows.length,0),2);
 assert.equal(groups.find(([label])=>label==="U.S. federal government")?.[1].length,0);
});
