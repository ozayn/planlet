export type ActionLabel = {
  title: string;
  ariaLabel: string;
};

export const ACTION_LABELS = {
  copy: {
    title: "Copy as text",
    ariaLabel: "Copy plan as text",
  },
  shareInsidePlanlet: {
    title: "Share inside Planlet",
    ariaLabel: "Share inside Planlet",
  },
  more: {
    title: "More",
    ariaLabel: "More actions",
  },
  morePlan: {
    title: "More",
    ariaLabel: "More plan actions",
  },
  moreItem: {
    title: "More",
    ariaLabel: "More item actions",
  },
  editTitle: {
    title: "Edit title",
    ariaLabel: "Edit plan title",
  },
  editItem: {
    title: "Edit",
    ariaLabel: "Edit item",
  },
  details: {
    title: "Details",
    ariaLabel: "Open item details",
  },
  addSubtask: {
    title: "Add subtask",
    ariaLabel: "Add subtask",
  },
  taskNote: {
    title: "Task note",
    ariaLabel: "Task note",
  },
  comments: {
    title: "Comments",
    ariaLabel: "Comments",
  },
  moveItemUp: {
    title: "Move up",
    ariaLabel: "Move item up",
  },
  moveItemDown: {
    title: "Move down",
    ariaLabel: "Move item down",
  },
  deleteItem: {
    title: "Delete",
    ariaLabel: "Delete item",
  },
  deletePlan: {
    title: "Delete plan",
    ariaLabel: "Delete plan",
  },
  privateObservations: {
    title: "Private observations",
    ariaLabel: "Private observations",
  },
  moreObservation: {
    title: "More",
    ariaLabel: "Open observation actions",
  },
  editObservation: {
    title: "Edit",
    ariaLabel: "Edit observation",
  },
  deleteObservation: {
    title: "Delete",
    ariaLabel: "Delete observation",
  },
  gratitude: {
    title: "Gratitude",
    ariaLabel: "Gratitude",
  },
  moreGratitude: {
    title: "More",
    ariaLabel: "Open gratitude actions",
  },
  editGratitude: {
    title: "Edit",
    ariaLabel: "Edit gratitude",
  },
  deleteGratitude: {
    title: "Delete",
    ariaLabel: "Delete gratitude",
  },
  notifications: {
    title: "Notifications",
    ariaLabel: "Notifications",
  },
  summary: {
    title: "Summary",
    ariaLabel: "View summary",
  },
  previousDay: {
    title: "Previous day",
    ariaLabel: "Previous day",
  },
  nextDay: {
    title: "Next day",
    ariaLabel: "Next day",
  },
  previousWeek: {
    title: "Previous week",
    ariaLabel: "Previous week",
  },
  nextWeek: {
    title: "Next week",
    ariaLabel: "Next week",
  },
  chooseDate: {
    title: "Date",
    ariaLabel: "Choose plan date",
  },
  chooseWeek: {
    title: "Week",
    ariaLabel: "Choose week",
  },
  itemStatus: {
    title: "Item status",
    ariaLabel: "Item status",
  },
  planActions: {
    title: "Plan actions",
    ariaLabel: "Plan actions",
  },
  itemActions: {
    title: "Item actions",
    ariaLabel: "Item actions",
  },
} as const satisfies Record<string, ActionLabel>;
