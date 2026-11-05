"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin-stats";
import { changeJobCategory } from "@/lib/job-categories";
const schema=z.object({operation:z.enum(["add","rename","retire","restore","group"]),broadGroup:z.string().trim().max(80).optional(),id:z.string().max(160).optional(),label:z.string().trim().min(1).max(80).optional(),conflict:z.boolean().optional()});
export async function changeJobCategoryAction(input:unknown) {
  const user=await requireAdminUser();
  const parsed=schema.safeParse(input);if(!parsed.success)return {success:false as const,error:'Check the category name and try again.'};
  try {
    const categories=await changeJobCategory(user.id,parsed.data);
    revalidatePath('/admin/job-categories');revalidatePath('/jobs');
    return {success:true as const,categories};
  } catch(error) {return {success:false as const,error:error instanceof Error?error.message:'Could not save categories.'};}
}
