"use client";
import { useState } from "react";
import type { TrackerDetails } from "@/lib/job-tracker-details";
import { missionLabels, missionReview } from "@/lib/job-missions";
export function JobMissionFields({value, onChange, disabled}: {
  value: TrackerDetails; onChange: (value: TrackerDetails) => void; disabled: boolean;
}) {
  const [custom, setCustom] = useState({employerIndustries: "", missionFields: ""});
  function update(patch: Partial<TrackerDetails>) {
    onChange({...value, ...patch, classificationOrigin: "manual"});
  }
  return <details className="rounded-lg border border-border-soft p-3">
    <summary className="cursor-pointer text-sm font-medium">Field and mission · {missionReview(value)}</summary>
    <p className="mt-2 text-xs text-muted">Classify the actual team or project separately from the employer’s industry. Leave unknown when evidence is missing; select several for mixed work. Your corrections take precedence.</p>
    {([['employerIndustries', 'Employer industry', 'employerEvidence', 'employerSource'], ['missionFields', 'Role / team mission', 'missionEvidence', 'missionSource']] as const).map(([key, label, evidence, source]) =>
      <fieldset key={key} disabled={disabled} className="mt-4 space-y-2">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="grid gap-x-3 sm:grid-cols-2">
          {[...new Set([...missionLabels, ...(value[key] ?? [])])].map(option => <label key={option} className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={value[key]?.includes(option) ?? false} onChange={event => update({[key]: event.target.checked ? [...(value[key] ?? []), option] : value[key].filter(v => v !== option)})} />{option}
          </label>)}
        </div>
        <div className="flex gap-2">
          <input aria-label={`Custom ${label} label`} placeholder="Custom label" className="ui-input min-h-10 min-w-0 flex-1 px-3" value={custom[key]} onChange={event => setCustom({...custom, [key]: event.target.value})} maxLength={80} />
          <button type="button" className="ui-btn-secondary min-h-10 px-3" disabled={!custom[key].trim() || (value[key]?.length ?? 0) >= 20} onClick={() => {update({[key]: [...new Set([...(value[key] ?? []), custom[key].trim()])]}); setCustom({...custom, [key]: ""});}}>Add</button>
        </div>
        <p className="text-xs text-muted">{value[key]?.length ? value[key].join(" · ") : "Unknown"}</p>
        <label className="block text-xs">Evidence note<textarea className="ui-input mt-1 w-full px-3 py-2" rows={2} value={value[evidence] ?? ""} onChange={event => update({[evidence]: event.target.value})} /></label>
        <label className="block text-xs">Source link<input type="url" className="ui-input mt-1 min-h-10 w-full px-3" value={value[source] ?? ""} onChange={event => update({[source]: event.target.value})} /></label>
      </fieldset>)}
  </details>;
}
