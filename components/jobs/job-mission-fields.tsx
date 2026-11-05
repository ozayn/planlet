"use client";
import { governmentLabels, type GovernmentRelationship } from "@/lib/job-government";
import Link from "next/link";
import { useState } from "react";
import type { TrackerDetails } from "@/lib/job-tracker-details";
import { useJobCategories } from "./job-category-context";
import { missionReview } from "@/lib/job-missions";
export function JobMissionFields({value, onChange, disabled}: {
  value: TrackerDetails; onChange: (value: TrackerDetails) => void; disabled: boolean;
}) {
  const categories = useJobCategories();
  const [search, setSearch] = useState({employerIndustries:"", missionFields:""});
  const [custom, setCustom] = useState({employerIndustries: "", missionFields: ""});
  function update(patch: Partial<TrackerDetails>) {
    onChange({...value, ...patch, classificationOrigin: "manual"});
  }
  return <details className="rounded-lg border border-border-soft p-3">
    <summary className="cursor-pointer text-sm font-medium">Field and mission · {missionReview(value, categories)}</summary>
    <Link href="/admin/job-categories" className="ui-text-link mt-2 inline-block min-h-10 text-xs" target="_blank">Manage categories</Link>
    <p className="mt-2 text-xs text-muted">Classify the actual team or project separately from the employer’s industry. Leave unknown when evidence is missing; select several for mixed work. Your corrections take precedence.</p>
    <fieldset disabled={disabled} className="mt-4 space-y-2">
      <legend className="text-sm font-medium">Government relationship</legend>
      <p className="text-xs text-muted">Classify the employer and actual assignment, separately from mission. A clearance, government funding, or a DC address alone does not establish government employment.</p>
      <select aria-label="Government relationship" className="ui-input min-h-10 w-full px-3" value={value.governmentRelationship ?? "UNKNOWN"} onChange={event => onChange({...value,governmentRelationship:event.target.value as GovernmentRelationship,governmentClassificationOrigin:"manual"})}>
        {Object.entries(governmentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
      <label className="block text-xs">Evidence note<textarea className="ui-input mt-1 w-full px-3 py-2" rows={2} value={value.governmentEvidence ?? ""} onChange={event=>onChange({...value,governmentEvidence:event.target.value,governmentClassificationOrigin:"manual"})}/></label>
      <label className="block text-xs">Source link<input type="url" className="ui-input mt-1 min-h-10 w-full px-3" value={value.governmentSource ?? ""} onChange={event=>onChange({...value,governmentSource:event.target.value,governmentClassificationOrigin:"manual"})}/></label>
    </fieldset>
    {([['employerIndustries', 'Employer industry', 'employerEvidence', 'employerSource'], ['missionFields', 'Role / team mission', 'missionEvidence', 'missionSource']] as const).map(([key, label, evidence, source]) =>
      <fieldset key={key} disabled={disabled} className="mt-4 space-y-2">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="flex flex-wrap gap-2">{value[key]?.length ? value[key].map(option=><button type="button" key={option} className="ui-input min-h-9 px-2 text-xs" aria-label={`Remove ${option} from ${label}`} onClick={()=>update({[key]:value[key].filter(v=>v!==option)})}>{option} ×</button>) : <span className="text-xs text-muted">Unknown</span>}</div>
        <details className="space-y-2"><summary className="cursor-pointer min-h-10 text-sm">Add or find category</summary>
          <input type="search" aria-label={`Search ${label} categories`} className="ui-input min-h-10 w-full px-3" value={search[key]} onChange={event=>setSearch({...search,[key]:event.target.value})}/>
          <div className="max-h-56 overflow-y-auto">{[...new Set([...categories.filter(c=>!c.retired&&!/^Company:/i.test(c.label)).map(c=>c.label),...(value[key]??[])])].filter(option=>option.toLowerCase().includes(search[key].toLowerCase())).map(option=><label key={option} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={value[key]?.includes(option)??false} onChange={event=>update({[key]:event.target.checked?[...(value[key]??[]),option]:value[key].filter(v=>v!==option)})}/>{option}</label>)}</div>
          <div className="flex gap-2"><input aria-label={`Custom ${label} label`} placeholder="New category" className="ui-input min-h-10 min-w-0 flex-1 px-3" value={custom[key]} onChange={event=>setCustom({...custom,[key]:event.target.value})} maxLength={80}/><button type="button" className="ui-btn-secondary min-h-10 px-3" disabled={!custom[key].trim()||(value[key]?.length??0)>=20} onClick={()=>{update({[key]:[...new Set([...(value[key]??[]),custom[key].trim()])]});setCustom({...custom,[key]:""});}}>Add</button></div>
        </details>
        <label className="block text-xs">Evidence note<textarea className="ui-input mt-1 w-full px-3 py-2" rows={2} value={value[evidence] ?? ""} onChange={event => update({[evidence]: event.target.value})} /></label>
        <label className="block text-xs">Source link<input type="url" className="ui-input mt-1 min-h-10 w-full px-3" value={value[source] ?? ""} onChange={event => update({[source]: event.target.value})} /></label>
      </fieldset>)}
  </details>;
}
