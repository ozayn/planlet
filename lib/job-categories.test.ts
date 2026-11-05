import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeJobCategories,renameCategoryDetails,canonicalCategoryDetails,defaultJobCategories} from './job-category-types';
import {missionReview} from './job-missions';
import {emptyTrackerDetails} from './job-tracker-details';
test('renamed and retired categories retain stable identity and conflict flags',()=>{
 const original=defaultJobCategories.find(c=>c.label==='Military / defense')!;
 const renamed={...original,label:'Defense work',retired:true,aliases:['Military / defense']};
 const result=mergeJobCategories([renamed],['Military / defense','Defense work','Wearables']);
 assert.equal(result.filter(c=>c.id===original.id).length,1);
 assert.equal(result.find(c=>c.id===original.id)?.retired,true);
 assert.equal(result.some(c=>c.label==='Military / defense'),false);
 assert.equal(missionReview({...emptyTrackerDetails(),missionFields:['Defense work']},result),'Mission conflict');
});
test('rename only changes label arrays, preserving notes, blockers and submitted materials',()=>{
 const d={...emptyTrackerDetails(),missionFields:['Research','Research'],employerIndustries:['Research'],blockerNote:'Keep',resumeVersion:'submitted.pdf'};
 const next=renameCategoryDetails(d,'Research','Academic research');
 assert.deepEqual(next.missionFields,['Academic research']);assert.deepEqual(next.employerIndustries,['Academic research']);
 assert.equal(next.blockerNote,'Keep');assert.equal(next.resumeVersion,'submitted.pdf');assert.deepEqual(d.missionFields,['Research','Research']);
});
test('stale editor labels resolve through aliases without dropping unrelated fields',()=>{
 const d={...emptyTrackerDetails(),missionFields:['Old label','New label','Custom'],employerIndustries:['Old label'],resumeVersion:'original.pdf'};
 const next=canonicalCategoryDetails(d,[{id:'stable',label:'New label',retired:false,conflict:false,aliases:['Old label']}]);
 assert.deepEqual(next.missionFields,['New label','Custom']);assert.deepEqual(next.employerIndustries,['New label']);assert.equal(next.resumeVersion,'original.pdf');
});
