"use client";
import { useState, useTransition } from "react";
import { saveMissionPreferencesAction } from "@/app/(app)/jobs/actions";
import type { MissionPreferences } from "@/lib/job-mission-summary";
export function JobMissionPreferences({value,onSave}:{value:MissionPreferences;onSave:(value:MissionPreferences)=>void}) {
  const [draft,setDraft]=useState(value);
  const [message,setMessage]=useState("");
  const [pending,startTransition]=useTransition();
  return <details className="ui-card-padded space-y-3">
    <summary className="cursor-pointer text-sm font-medium">Edit mission preferences</summary>
    <p className="text-xs text-muted">One broad group or exact mission tag per line. Exclusions take priority. These lists describe your interests, not salary, location, qualifications, or application outcomes.</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();startTransition(async()=>{const result=await saveMissionPreferencesAction(Object.fromEntries(Object.entries(draft).map(([key,labels])=>[key,[...new Set(labels.map(v=>v.trim()).filter(Boolean))]])));if(result.success){onSave(result.preferences);setMessage("Preferences saved.");}else setMessage(result.error);});}}>
      {(["preferred","adjacent","excluded"] as const).map(key=><label key={key} className="block text-sm capitalize">{key}<textarea className="ui-input mt-1 w-full px-3 py-2" rows={3} value={draft[key].join("\n")} disabled={pending} onChange={e=>setDraft({...draft,[key]:e.target.value.split("\n")})}/></label>)}
      <button className="ui-btn-secondary min-h-10 px-3" disabled={pending}>Save preferences</button>
      <p role="status" className="text-xs text-muted">{message}</p>
    </form>
  </details>;
}
