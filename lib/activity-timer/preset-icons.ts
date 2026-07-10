export const MAX_PRESET_ICON_NAME_LENGTH = 40;

export const ACTIVITY_PRESET_ICON_NAMES = [
  "foot",
  "stairs",
  "stretch",
  "book-open",
  "brain",
  "camera",
  "droplets",
  "lotus",
  "home",
  "utensils",
  "shirt",
  "reading",
  "pencil",
  "laptop",
  "search",
  "map",
  "dumbbell",
  "sparkles",
  "circle",
] as const;

export type ActivityPresetIconName =
  (typeof ACTIVITY_PRESET_ICON_NAMES)[number];

export const PRESET_ICON_OPTIONS: Array<{
  value: ActivityPresetIconName | null;
  label: string;
}> = [
  { value: null, label: "None" },
  { value: "foot", label: "Foot" },
  { value: "stairs", label: "Stairs" },
  { value: "stretch", label: "Stretch" },
  { value: "book-open", label: "Book" },
  { value: "brain", label: "Brain" },
  { value: "camera", label: "Camera" },
  { value: "droplets", label: "Water" },
  { value: "lotus", label: "Calm" },
  { value: "home", label: "Home" },
  { value: "utensils", label: "Kitchen" },
  { value: "shirt", label: "Laundry" },
  { value: "pencil", label: "Write" },
  { value: "laptop", label: "Computer" },
  { value: "search", label: "Search" },
  { value: "map", label: "Map" },
  { value: "dumbbell", label: "Exercise" },
  { value: "sparkles", label: "Custom" },
];

export function normalizePresetIconName(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > MAX_PRESET_ICON_NAME_LENGTH) {
    return trimmed.slice(0, MAX_PRESET_ICON_NAME_LENGTH);
  }

  return trimmed;
}

export function resolvePresetIconName(
  iconName: string | null | undefined,
): ActivityPresetIconName {
  const normalized = normalizePresetIconName(iconName);

  if (!normalized) {
    return "circle";
  }

  if (
    ACTIVITY_PRESET_ICON_NAMES.includes(normalized as ActivityPresetIconName)
  ) {
    return normalized as ActivityPresetIconName;
  }

  return "circle";
}
