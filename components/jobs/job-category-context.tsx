"use client";
import { createContext, useContext } from "react";
import { defaultJobCategories } from "@/lib/job-category-types";
export const JobCategoryContext=createContext(defaultJobCategories);
export const useJobCategories=()=>useContext(JobCategoryContext);
