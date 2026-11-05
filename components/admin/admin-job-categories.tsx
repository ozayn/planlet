"use client";
import { useState,useTransition } from "react";
import { changeJobCategoryAction } from "@/app/(app)/admin/job-categories/actions";
import { broadMissionGroups } from "@/lib/job-mission-summary";
import type { JobCategory } from "@/lib/job-category-types";
export function AdminJobCategories({initialCategories}:{initialCategories:JobCategory[]}) {
  const [categories,setCategories]=useState(initialCategories);
  const [name,setName]=useState('');const [conflict,setConflict]=useState(false);
  const [edit,setEdit]=useState<{id:string;label:string}|null>(null);
  const [message,setMessage]=useState('');const [pending,startTransition]=useTransition();
  const [showRetired,setShowRetired]=useState(false);
  function save(input:Parameters<typeof changeJobCategoryAction>[0]) {setMessage('');startTransition(async()=>{const result=await changeJobCategoryAction(input);if(result.success){setCategories(result.categories);setName('');setEdit(null);setMessage('Saved. Refresh any open tracker tabs to see the change.');}else setMessage(result.error);});}
  return <div className="space-y-5">
    <form className="space-y-2" onSubmit={e=>{e.preventDefault();save({operation:'add',label:name,conflict});}}>
      <label className="block text-sm">New category<input className="ui-input mt-1 min-h-10 w-full px-3" value={name} onChange={e=>setName(e.target.value)} maxLength={80} required disabled={pending}/></label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={conflict} onChange={e=>setConflict(e.target.checked)} disabled={pending}/>Flag as outside my current mission preferences</label>
      <button className="ui-btn-primary min-h-10 px-4" disabled={pending||!name.trim()}>Add category</button>
    </form>
    <p role="status" className="text-sm">{message}</p>
    <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={showRetired} onChange={e=>setShowRetired(e.target.checked)}/>Show retired categories</label>
    <ul className="divide-y divide-border-soft">
      {categories.filter(c=>showRetired||!c.retired).map(c=><li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
        {edit?.id===c.id ? <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();save({operation:'rename',id:c.id,label:edit.label});}}><input aria-label="Rename category" className="ui-input min-h-10 px-3" value={edit.label} onChange={e=>setEdit({...edit,label:e.target.value})} maxLength={80} required disabled={pending}/><button className="ui-btn-primary min-h-10 px-3" disabled={pending}>Save</button><button type="button" className="ui-btn-secondary min-h-10 px-3" onClick={()=>setEdit(null)}>Cancel</button></form> : <span className="text-sm">{c.label}{c.conflict?' · Mission conflict':''}{c.retired?' · Retired':''}</span>}
        <label className="text-xs">Broad mission group<select aria-label={`Broad group for ${c.label}`} className="ui-input block min-h-10 max-w-full px-2" value={c.broadGroup??""} disabled={pending} onChange={e=>save({operation:"group",id:c.id,broadGroup:e.target.value})}><option value="">Default mapping</option>{broadMissionGroups.filter(v=>v!=="Unknown / review needed").map(v=><option key={v}>{v}</option>)}</select></label>
        <div className="flex gap-2"><button className="ui-text-link min-h-10 px-2 text-sm" disabled={pending} aria-label={`Rename ${c.label}`} onClick={()=>setEdit({id:c.id,label:c.label})}>Rename</button><button className="ui-text-link min-h-10 px-2 text-sm" disabled={pending} aria-label={`${c.retired?"Restore":"Retire"} ${c.label}`} onClick={()=>save({operation:c.retired?'restore':'retire',id:c.id})}>{c.retired?'Restore':'Retire'}</button></div>
      </li>)}
    </ul>
  </div>;
}
