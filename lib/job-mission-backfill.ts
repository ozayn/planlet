// Curated saved-posting evidence only. No employer-name or clearance inference.
// Exact role + evidence checks make this conservative and safe to re-run.
type Rule = {company: string; title: string; quote: string; missions: string[]};
const rules: Rule[] = [
  {company:"ACT",title:"Data Scientist II, 35487f31",quote:"Student college/career recommendations",missions:["Education / learning"]},
  {company:"Altis Labs",title:"Senior Machine Learning Scientist (US)",quote:"improving how oncology trials measure treatment benefit",missions:["Healthcare"]},
  {company:"American Institutes for Research (AIR)",title:"Quantitative Education Researcher, Learning Supports",quote:"projects focused on understanding the role AI technologies play in educational opportunities",missions:["Education / learning"]},
  {company:"American University",title:"Research Associate - PEER Center",quote:"policy research and analyses for the Postsecondary Education",missions:["Education / learning","Government / public policy"]},
  {company:"Baltimore Museum of Art",title:"Manager, Audience Insights and Data Analyst",quote:"audience/visitor analytics",missions:["Museums / art / culture"]},
  {company:"BioIntelliSense",title:"Full Stack Data Engineer",quote:"clinical data pipelines",missions:["Healthcare"]},
  {company:"Carex Consulting Group",title:"Senior Data Scientist (Healthtech)",quote:"national youth mental health initiative",missions:["Healthcare"]},
  {company:"Clover Health",title:"Senior Data Scientist",quote:"supporting Primary Care Physicians",missions:["Healthcare"]},
  {company:"Doximity",title:"Data Scientist",quote:"Healthcare clinician-platform analytics",missions:["Healthcare"]},
  {company:"MasteryPrep",title:"Backend Product Engineer",quote:"Backend learning and assessment products",missions:["Education / learning"]},
  {company:"National Gallery of Art",title:"Information Technology Specialist (Data Scientist), NGA-27-267-NF",quote:"collection management and museum operations",missions:["Museums / art / culture"]},
  {company:"Smithsonian Institution",title:"Born-Digital Strategist, IS-1420-12",quote:"Department Archives of American Art",missions:["Museums / art / culture"]},
  {company:"Thatch",title:"Data Scientist: Product",quote:"healthcare benefits platform",missions:["Healthcare"]},
  {company:"Tiny Health",title:"Microbiome Data Scientist",quote:"healthcare research, longitudinal analysis",missions:["Healthcare"]},
  {company:"Whitman-Walker Health",title:"Health Data Analyst",quote:"EMR analysis, grant reporting, quality improvement",missions:["Healthcare"]},
  {company:"General Dynamics Information Technology",title:"Healthcare Data Scientist (Medicare/Medicaid), RQ227332",quote:"Medicare/Medicaid fraud-waste-abuse analytics",missions:["Healthcare","Government / public policy"]},
  {company:"George Mason University",title:"Research Engineer: Systems Engineering and Software Development",quote:"advanced research in defense, intelligence, and security-related applications",missions:["Military / defense"]},
  {company:"University of Maryland",title:"Computational Linguist",quote:"research, innovation, and technology transition to improve decision making for U.S. national security",missions:["Defense-adjacent"]},
];
export function missionBackfillPatch(job: {company: string; title: string; description: string | null; notes: string | null; url: string | null; trackerDetails: unknown}) {
  const details = job.trackerDetails && typeof job.trackerDetails === "object" && !Array.isArray(job.trackerDetails) ? job.trackerDetails as Record<string, unknown> : {};
  // Treat any existing evidence, labels or manual clearing as authoritative.
  if (details.classificationOrigin || (Array.isArray(details.missionFields) && details.missionFields.length) || details.missionEvidence || details.missionSource) return null;
  const rule = rules.find(rule => rule.company === job.company && rule.title === job.title && `${job.description ?? ""}\n${job.notes ?? ""}`.toLowerCase().includes(rule.quote.toLowerCase()));
  if (!rule || !job.url || !/^https?:\/\//i.test(job.url)) return null;
  return {missionFields:rule.missions, missionEvidence:`Saved posting/notes: “${rule.quote}”. Employer portfolio not inferred.`,missionSource:job.url,classificationOrigin:"backfill" as const};
}
