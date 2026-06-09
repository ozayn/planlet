export const PRODUCT = {
  name: "Planlet",
  tagline: "A gentle planner for tasks, intentions, and the shape of your days.",
  description:
    "Planlet is a mobile-first planning app that turns Farsi/English daily, monthly, and yearly intentions into structured plans. It is not a full calendar replacement. It helps users create soft plans, track progress, and copy shareable updates for friends.",
  themeColor: "#4a7c6f",
  backgroundColor: "#f8f7f4",
} as const;

export const PWA = {
  shortName: PRODUCT.name,
  description: PRODUCT.description,
  themeColor: PRODUCT.themeColor,
  backgroundColor: PRODUCT.backgroundColor,
} as const;
