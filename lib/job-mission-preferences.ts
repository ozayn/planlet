import { z } from "zod";
import { prisma } from "./prisma";
import { defaultMissionPreferences } from "./job-mission-summary";
const labels = z.array(z.string().trim().min(1).max(80)).max(80);
export const missionPreferencesSchema = z.object({preferred:labels,adjacent:labels,excluded:labels});
export async function getMissionPreferences(userId: string) {
  const setting = await prisma.appSetting.findUnique({where:{key:`job-mission-preferences:${userId}`}});
  const result = missionPreferencesSchema.safeParse(setting?.value);
  return result.success ? result.data : defaultMissionPreferences;
}
export async function saveMissionPreferences(userId: string, input: unknown) {
  const value = missionPreferencesSchema.parse(input);
  const key = `job-mission-preferences:${userId}`;
  await prisma.appSetting.upsert({where:{key},create:{key,value},update:{value}});
  return value;
}
