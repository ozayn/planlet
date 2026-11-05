import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { mergeJobCategories, renameCategoryDetails } from "./job-category-types";
const key=(userId:string)=>`job-categories:${userId}`;
export async function getJobCategories(userId:string) {
  const [setting,jobs]=await Promise.all([prisma.appSetting.findUnique({where:{key:key(userId)}}),prisma.jobApplication.findMany({where:{userId},select:{trackerDetails:true}})]);
  const used=jobs.flatMap(j=>{const d=j.trackerDetails as Record<string,unknown>;return [d?.missionFields,d?.employerIndustries].flatMap(v=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[]);});
  return mergeJobCategories(setting?.value,used);
}
export async function changeJobCategory(userId:string, input:{operation:"add"|"rename"|"retire"|"restore"|"group";broadGroup?:string;id?:string;label?:string;conflict?:boolean}) {
  return prisma.$transaction(async tx=>{
    // Serialize category edits for this account; no other account's taxonomy or jobs is touched.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const setting=await tx.appSetting.findUnique({where:{key:key(userId)}});
    await tx.$queryRaw`SELECT id FROM "JobApplication" WHERE "userId"=${userId} ORDER BY id FOR UPDATE`;
    const jobs=await tx.jobApplication.findMany({where:{userId},select:{id:true,trackerDetails:true}});
    const used=jobs.flatMap(j=>{const d=j.trackerDetails as Record<string,unknown>;return [d?.missionFields,d?.employerIndustries].flatMap(v=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[]);});
    const categories=mergeJobCategories(setting?.value,used);
    const label=input.label?.trim();
    if(input.operation==='add'||input.operation==='rename') {
      if(!label||label.length>80||label.toLowerCase()==='unknown') throw Error('Use a category name of 1–80 characters. Unknown is reserved.');
      if(categories.some(c=>c.id!==input.id&&(c.label.toLowerCase()===label.toLowerCase()||c.aliases?.some(alias=>alias.toLowerCase()===label.toLowerCase())))) throw Error('That category already exists.');
    }
    if(input.operation==='add') categories.push({id:randomUUID(),label:label!,retired:false,conflict:input.conflict??false});
    else {
      const category=categories.find(c=>c.id===input.id);if(!category)throw Error('Category not found. Refresh and try again.');
      if(input.operation==='rename') {
        const before=category.label;category.aliases=[...new Set([...(category.aliases??[]),before])].filter(v=>v!==label);category.label=label!;
        // Keep the stable conflict flag through rename; only label arrays change.
        for(const job of jobs) {
          const details=job.trackerDetails as Record<string,unknown>;
          const next=renameCategoryDetails(details,before,label!);
          if(JSON.stringify(next)!==JSON.stringify(details)) await tx.jobApplication.update({where:{id:job.id,userId},data:{trackerDetails:next as never}});
        }
      } else if(input.operation==='group') category.broadGroup=input.broadGroup?.trim()||undefined;
      else category.retired=input.operation==='retire';
    }
    await tx.appSetting.upsert({where:{key:key(userId)},create:{key:key(userId),value:categories},update:{value:categories}});
    return categories.sort((a,b)=>a.label.localeCompare(b.label));
  });
}
