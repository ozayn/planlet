import { missionLabels } from "./job-missions";
export type JobCategory = { id: string; label: string; retired: boolean; conflict: boolean; broadGroup?: string; aliases?: string[] };
export const defaultJobCategories: JobCategory[] = missionLabels.map(label=>({id:`default:${label}`,label,retired:label==="Productivity / planning",conflict:label==="Military / defense"||label==="Defense-adjacent"}));
export function mergeJobCategories(saved: unknown, used: string[]): JobCategory[] {
  const stored=Array.isArray(saved) ? saved.filter((v): v is JobCategory=>!!v&&typeof v.id==="string"&&typeof v.label==="string"&&typeof v.retired==="boolean"&&typeof v.conflict==="boolean") : [];
  const byId=new Map(defaultJobCategories.map(c=>[c.id,c]));
  for(const item of stored) byId.set(item.id,item);
  const categories=[...byId.values()];
  for(const label of new Set(used)) if(label&&label!=="Unknown"&&!categories.some(c=>c.label.toLowerCase()===label.toLowerCase() || c.aliases?.some(alias=>alias.toLowerCase()===label.toLowerCase()))) categories.push({id:`custom:${label}`,label,retired:false,conflict:false});
  return categories.sort((a,b)=>a.label.localeCompare(b.label));
}
export function renameCategoryDetails(details: Record<string,unknown>, from: string, to: string) {
  const next={...details};
  for(const key of ["missionFields","employerIndustries"]) if(Array.isArray(details[key])) next[key]=[...new Set((details[key] as string[]).map(v=>v===from?to:v))];
  return next;
}

export function canonicalCategoryDetails<T extends {missionFields:string[];employerIndustries:string[]}>(details:T, categories:readonly JobCategory[]):T {
  const canonical=(labels:string[])=>[...new Set(labels.map(label=>categories.find(c=>c.label===label||c.aliases?.includes(label))?.label??label))];
  return {...details,missionFields:canonical(details.missionFields??[]),employerIndustries:canonical(details.employerIndustries??[])};
}
