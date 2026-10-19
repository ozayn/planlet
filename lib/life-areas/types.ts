export type SerializedLifeArea = {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
};

export type SerializedPlanItemLifeArea = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type PlanOrganizeViewValue = "LIST" | "LIFE_AREAS";

export type LifeAreaTaskGroup = {
  areaId: string;
  areaName: string;
  archived: boolean;
  items: import("@/lib/plan-serialize").SerializedPlanItem[];
};
