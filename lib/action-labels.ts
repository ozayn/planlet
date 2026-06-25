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
  moveUnderTask: {
    title: "Move under task",
    ariaLabel: "Move under another task",
  },
  moveToRootTasks: {
    title: "Move to root tasks",
    ariaLabel: "Move to root tasks",
  },
  moveToDate: {
    title: "Move to date",
    ariaLabel: "Move to another date",
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
  therapyThoughts: {
    title: "Therapy thoughts",
    ariaLabel: "Therapy thoughts",
  },
  moreTherapyThought: {
    title: "More",
    ariaLabel: "Open therapy thought actions",
  },
  editTherapyThought: {
    title: "Edit",
    ariaLabel: "Edit therapy thought",
  },
  deleteTherapyThought: {
    title: "Delete",
    ariaLabel: "Delete therapy thought",
  },
  moreLearningEntry: {
    title: "More",
    ariaLabel: "Open learning entry actions",
  },
  editLearningEntry: {
    title: "Edit",
    ariaLabel: "Edit learning entry",
  },
  deleteLearningEntry: {
    title: "Delete",
    ariaLabel: "Delete learning entry",
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
    title: "Choose date",
    ariaLabel: "Choose date",
  },
  chooseWeek: {
    title: "Choose week",
    ariaLabel: "Choose week",
  },
  previousMonth: {
    title: "Previous month",
    ariaLabel: "Previous month",
  },
  nextMonth: {
    title: "Next month",
    ariaLabel: "Next month",
  },
  chooseMonth: {
    title: "Choose month",
    ariaLabel: "Choose month",
  },
  previousYear: {
    title: "Previous year",
    ariaLabel: "Previous year",
  },
  nextYear: {
    title: "Next year",
    ariaLabel: "Next year",
  },
  chooseYear: {
    title: "Choose year",
    ariaLabel: "Choose year",
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
  importanceUrgency: {
    title: "Importance and urgency",
    ariaLabel: "Importance and urgency",
  },
} as const satisfies Record<string, ActionLabel>;
