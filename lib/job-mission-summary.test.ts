import {vettingReview} from "./job-vetting";
import {credibilityConcern} from "./job-credibility";
import {emptyJobFilters,matchesJobFilters} from "./job-tracker-filters";
import {groupByEmployerSize,hiringEmployerSize} from "./job-employer-size";
import {restoreJobSession} from "./job-tracker-session-state";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JobTrackerTable} from "../components/jobs/job-tracker-table";
import {test} from "node:test";
import assert from "node:assert/strict";
import {emptyTrackerDetails,mergeTrackerDetails} from "./job-tracker-details";
import type {SerializedJobApplication as Job} from "./job-applications";
import {actualMissions,groupByMission,missionReview} from "./job-missions";
import {defaultMissionPreferences as prefs,groupByBroadMission,groupByEmployerIndustry,preferenceAlignment,qualityReviewGroups,rangeContext,submissionRange} from "./job-mission-summary";
import {interestReview,practicalConstraints,reviewQueueGroup} from "./job-review-queue";
import {insights,outcome,applicationTimeline,localDate} from "./job-tracker-insights";
function job(id:string,details:Partial<Job['trackerDetails']>={},patch:Partial<Job>={}):Job {return {id,company:"Example",title:"Scientist",url:null,description:null,summary:null,source:null,referrer:null,location:null,salary:null,appliedDate:"2026-10-07",status:"APPLIED",notes:"Original notes",createdAt:"2026-10-07T22:00:00Z",updatedAt:"2026-10-07T22:00:00Z",submissionConfirmed:true,submittedDate:"2026-10-07",trackerDetails:{...emptyTrackerDetails(),...details},trackerHistory:[],...patch};}
test("Smithsonian October 7 receipt stays in range as research and museum institution context without manufacturing confirmations",()=>{
 const smithsonian=job("si",{missionFields:["Science / research"],employerIndustries:["Museums / cultural institutions","Research institutions"]},{company:"Smithsonian Institution",trackerHistory:[{at:"2026-10-07T22:17:06Z",from:"SAVED",to:"APPLIED",kind:"confirmed",date:"2026-10-07"}]});
 const saved=job("saved",{missionFields:["Science / research"]},{status:"SAVED",submissionConfirmed:false,submittedDate:null});
 const closed=job("closed",{missionFields:["Museums / art / culture"]},{status:"ARCHIVED",submissionConfirmed:false,submittedDate:null});
 const records=[smithsonian,smithsonian,saved,closed];const before=JSON.stringify(records);
 const month=submissionRange(records,"2026-10-07","2026-11-05");assert.equal(month.length,1);
 assert.equal(groupByEmployerIndustry(month).find(([label])=>label==="Museums / cultural institutions")?.[1].length,1);
 assert.equal(groupByBroadMission(month).find(([label])=>label==="Civilian research tools")?.[1].length,1);
 assert.equal(groupByMission(month).some(([label])=>label==="Museums / art / culture"),false);
 assert.equal(submissionRange(month,"2026-10-08","2026-11-05").length,0);
 assert.deepEqual(rangeContext(records,"2026-10-08","2026-11-05").map(([,rows])=>rows.length),[1,2]);
 assert.equal(JSON.stringify(records),before);
});
test("confirmed museum mission appears on the proper local date after rejection; legacy draft date is excluded",()=>{
 const date=localDate(new Date("2026-11-02T03:30:00Z"),"America/New_York");assert.equal(date,"2026-11-01");
 const museum=job("museum",{missionFields:["Museums / art / culture"]},{submittedDate:date,status:"REJECTED"});
 const draft={...museum,id:"draft",status:"SAVED" as const,submissionConfirmed:false,submittedDate:null};
 assert.equal(groupByBroadMission(submissionRange([museum,draft],date,date))[0][1].length,1);
 assert.deepEqual(applicationTimeline([museum,draft],"2026-10-31","2026-11-02").map(([date,jobs])=>[date,jobs.length]),[["2026-10-31",0],["2026-11-01",1],["2026-11-02",0]]);
});
test("company fallback is industry context, never proof of client mission; equivalent labels deduplicate",()=>{
 const j=job("agency",{missionFields:["Company: Recruiting / staffing"],employerIndustries:["Recruiting / staffing","Company: Recruiting / staffing"]});
 assert.deepEqual(actualMissions(j.trackerDetails),[]);assert.equal(missionReview(j.trackerDetails),"Mission needs review");
 assert.deepEqual(groupByEmployerIndustry([j,j]).map(([label,rows])=>[label,rows.length]),[["Recruiting / staffing",1]]);
 assert.equal(groupByMission([j])[0][0],"Unknown");assert.equal(preferenceAlignment(j,prefs).label,"Unknown / review needed");
});
test("related healthcare tags deduplicate in broad groups while mixed work can overlap and confirmed total stays unique",()=>{
 const j=job("mixed",{missionFields:["Clinical care tools","Health data / reporting","Education / learning"]});
 const groups=groupByBroadMission([j,j]);assert.equal(groups.find(([label])=>label==="Health / behavior")?.[1].length,1);assert.equal(groups.find(([label])=>label==="Education / learning products")?.[1].length,1);assert.equal(insights([j,j],"2026-11-05").submissions.length,1);
});
test("enterprise automation, certification and fundraising do not imply a preferred personal app or learning product",()=>{
 for(const tag of ["Enterprise workflow automation","Enterprise content / digital assets","Developer productivity","Certification / test security","Fundraising / nonprofits"]){assert.notEqual(preferenceAlignment(job(tag,{missionFields:[tag]}),prefs).label,"Preferred");}
 assert.equal(preferenceAlignment(job("legacy",{missionFields:["Productivity / planning"]}),prefs).label,"Unknown / review needed");
 assert.equal(preferenceAlignment(job("university",{missionFields:["Universities / academic research"]}),prefs).label,"Unknown / review needed");
});
test("preferences and editable broad mappings explain interest; exclusions beat a manual preferred override",()=>{
 assert.equal(interestReview(job("defense",{missionFields:["Science / research","Defense-adjacent"],interestTier:"Preferred"}),prefs).label,"Excluded");
 const j=job("custom",{missionFields:["My tag"]});const categories=[{id:"custom",label:"My tag",retired:false,conflict:false,broadGroup:"Education / learning products"}];
 assert.equal(preferenceAlignment(j,prefs,categories).label,"Preferred");assert.equal(preferenceAlignment(j,{preferred:[],adjacent:[],excluded:[]},categories).label,"Other recorded missions");assert.equal(practicalConstraints(j).every(v=>v.state==="Unknown"),true);
});
test("readiness requires factual constraints and evidence; failed, blocked, missing pay and crossing ranges remain distinct",()=>{
 const j=job("ready",{salaryMin:"100000",salaryMax:"120000",currency:"USD",payPeriod:"Year",locationEligibility:"Met",locationEvidence:"Official posting permits DC residents / US remote",civilianScopeConfirmed:true,missionEvidence:"Civilian learning product",missionFields:["Education / learning"],candidateEvidence:"Python/SQL analysis; AI-assisted implementation",candidateEvidenceSource:"https://example.com/project",credibilityCheck:"Checked, no concerns found",credibilityEvidence:"Employer, recruiter identity and exact destination reviewed",credibilitySources:"https://example.com/job",credibilityCheckedDate:"2026-11-05",vettingRequirement:"None stated",vettingEvidence:"Reviewed qualifications",vettingSource:"https://example.com/job"},{status:"READY_TO_SUBMIT",submissionConfirmed:false,submittedDate:null});
 assert.equal(reviewQueueGroup(j,prefs),"Ready to apply");
 for(const status of ["NEEDS_INPUT","SUBMISSION_FAILED"] as const)assert.equal(reviewQueueGroup({...j,status},prefs),"Needs input / blocked");
 for(const patch of [{salaryMin:"",salaryMax:"",requestedSalary:"130000"},{salaryMin:"90000",salaryMax:"150000"}])assert.equal(reviewQueueGroup({...j,trackerDetails:{...j.trackerDetails,...patch}},prefs),"Review next");
 assert.equal(reviewQueueGroup({...j,trackerDetails:{...j.trackerDetails,salaryMin:"80000",salaryMax:"90000"}},prefs),"Outside current preferences");
 assert.equal(practicalConstraints({...j,trackerDetails:{...j.trackerDetails,locationEligibility:"Met",locationEvidence:""}})[0].state,"Unknown");
});
test("invitation is distinct from scheduled interviews and later rejection/withdrawal retains historical submission",()=>{
 const invited=job("invite",{responseStage:"Interview invited",responseEvidence:"Invitation email"});assert.equal(outcome(invited),"Interview invited (not scheduled)");assert.equal(insights([invited],"2026-11-05").interviews.length,0);assert.equal(qualityReviewGroups([invited]).find(([label])=>label==="Outcomes needing reconciliation")?.[1].length,1);
 for(const status of ["REJECTED","WITHDRAWN"] as const){const changed={...invited,status};assert.equal(submissionRange([changed],"2026-10-07","2026-11-05").length,1);assert.notEqual(outcome(changed),"Interview invited (not scheduled)");}
});

test("restored review dates and filters retain values while corrupt or stale session shapes use safe defaults",()=>{
 const range={from:"2026-11-01",to:"2026-11-05"};
 assert.deepEqual(restoreJobSession('{"from":"2026-10-07","to":"2026-11-05"}',range),{from:"2026-10-07",to:"2026-11-05"});
 assert.deepEqual(restoreJobSession('null',range),range);
 assert.deepEqual(restoreJobSession('{"from":42}',range),range);
 assert.deepEqual(restoreJobSession('not json',range),range);
});

test("employer size partitions unique confirmed applications and never substitutes agency or parent size",()=>{
 const direct=job("direct",{employerSizeBand:"Medium",employerSizeEntity:"Hiring employer"});
 const agency=job("agency",{employerSizeBand:"Large",employerSizeEntity:"Recruiting intermediary"});
 const parent=job("parent",{employerSizeBand:"Large",employerSizeEntity:"Parent organization"});
 const legacy=job("legacy");
 const draft=job("draft",{employerSizeBand:"Small",employerSizeEntity:"Hiring employer"},{submissionConfirmed:false,submittedDate:null,status:"NEEDS_INPUT"});
 const groups=groupByEmployerSize([direct,direct,agency,parent,legacy,draft]);
 assert.deepEqual(groups.map(([label,rows])=>[label,rows.length]),[["Small",0],["Medium",1],["Large",0],["Unknown",3]]);
 assert.equal(hiringEmployerSize(agency),"Unknown");
 assert.equal(groupByEmployerSize([agency],"Recruiting intermediary").find(([label])=>label==="Large")?.[1].length,1);
 assert.equal(groups.reduce((n,[,rows])=>n+rows.length,0),4);
});

test("partial and old-editor updates retain new context, immutable classification history, and other details",()=>{
 const current={...emptyTrackerDetails(),missionFields:["Science / research"],employerSizeBand:"Medium",employerSizeEntity:"Hiring employer",blockerNote:"Keep",classificationHistory:[{at:"2026-11-05T00:00:00Z",reason:"Reviewed",missionFields:["Original"],missionEvidence:"Old evidence",missionSource:"",classificationOrigin:"backfill"}]};
 const next=mergeTrackerDetails(current,{nextAction:"Review source",classificationHistory:[]});
 assert.equal(next.employerSizeBand,"Medium");assert.equal(next.blockerNote,"Keep");assert.equal(next.classificationHistory.length,1);
 const changed=mergeTrackerDetails(current,{missionFields:["Museums / art / culture"]},new Date("2026-11-05T19:00:00Z"));
 assert.equal(changed.classificationHistory.length,2);assert.deepEqual(changed.classificationHistory[1].missionFields,["Science / research"]);assert.deepEqual(current.missionFields,["Science / research"]);
});

test("credibility defaults stay unchecked; specific concerns filter and hold future work without changing status or historical counts",()=>{
 const old=job("old");assert.equal(old.trackerDetails.credibilityCheck,"Not checked");assert.equal(credibilityConcern(old.trackerDetails),false);
 const concern=job("concern",{credibilityCheck:"Needs review",credibilityEvidence:"Recruiter identity / application destination need checking"},{status:"READY_TO_SUBMIT",submissionConfirmed:false,submittedDate:null});
 assert.equal(reviewQueueGroup(concern,prefs),"Credibility review");assert.equal(reviewQueueGroup({...concern,submissionConfirmed:true,submittedDate:"2026-11-04"},prefs),"Credibility review");assert.equal(concern.status,"READY_TO_SUBMIT");
 assert.equal(matchesJobFilters(concern,"EVERYTHING","all",{...emptyJobFilters(),credibility:"Needs review"},"2026-11-05"),true);
 assert.equal(submissionRange([old,{...concern,submissionConfirmed:true,submittedDate:"2026-11-04"}],"2026-10-07","2026-11-05").length,2);
});

test("Public Trust, obtainability and active clearance remain distinct from mission and readiness",()=>{
 const j=job("vetting",{missionFields:["Education / learning"],vettingRequirement:"Able to obtain security clearance"},{submissionConfirmed:false,submittedDate:null,status:"SAVED"});
 assert.equal(vettingReview(j.trackerDetails).state,"Unknown");assert.equal(reviewQueueGroup(j,prefs),"Review next");assert.equal(preferenceAlignment(j,prefs).label,"Preferred");
 assert.equal(vettingReview({...j.trackerDetails,vettingRequirement:"Public Trust or suitability investigation"}).state,"Unknown");
 const active={...j,trackerDetails:{...j.trackerDetails,vettingRequirement:"Active security clearance required" as const}};
 assert.equal(vettingReview(active.trackerDetails).state,"Not met");assert.equal(reviewQueueGroup(active,prefs),"Needs input / blocked");
 const reviewed=job("invited",{responseStage:"Interview invited",responseEvidence:"Employer invitation reviewed",responseSource:"https://example.com/evidence",searchDecision:"Not pursuing"});
 assert.equal(qualityReviewGroups([reviewed]).find(([label])=>label==="Outcomes needing reconciliation")?.[1].length,0);
});

test("table renders a compact accessible one-page footer and explicit title action without redundant normal-state prose",()=>{
 const j=job("one",{missionFields:["Science / research"]});
 const html=renderToStaticMarkup(createElement(JobTrackerTable,{jobs:[j],onSelectJob:()=>{},userTimezone:"America/New_York"}));
 assert.match(html,/Credibility check/);assert.match(html,/>Scientist<\/button>/);assert.doesNotMatch(html,/Mission recorded/);
 assert.match(html,/1–1 of 1 applications/);assert.match(html,/disabled="" aria-label="Previous page"/);assert.match(html,/disabled="" aria-label="Next page"/);
 assert.ok(html.indexOf('aria-label="Application table pages"')>html.indexOf('</table>'));
});
test("empty and multi-page table rendering keeps accurate counts and accessible pagination",()=>{
 const empty=renderToStaticMarkup(createElement(JobTrackerTable,{jobs:[],onSelectJob:()=>{},userTimezone:"America/New_York"}));assert.match(empty,/0–0 of 0 applications/);
 const many=renderToStaticMarkup(createElement(JobTrackerTable,{jobs:Array.from({length:21},(_,i)=>job(String(i))),onSelectJob:()=>{},userTimezone:"America/New_York"}));
 assert.match(many,/1–20 of 21 applications/);assert.equal(many.match(/>Scientist<\/button>/g)?.length,20);assert.doesNotMatch(many,/disabled="" aria-label="Next page"/);
});
