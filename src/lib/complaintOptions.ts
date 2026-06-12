export const CATEGORY_VALUES = ["HEALTH", "WATER", "ROADS", "ELECTRICITY"] as const;

export type ComplaintCategory = typeof CATEGORY_VALUES[number];

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string; description: string }[] = [
  { value: "HEALTH", label: "Health", description: "Sanitation, waste, toilets, mosquito and public health hazards" },
  { value: "WATER", label: "Water", description: "Water supply, pipelines, tanks, leakage and sewage mixing" },
  { value: "ROADS", label: "Roads", description: "Roads, footpaths, potholes, drainage and traffic safety" },
  { value: "ELECTRICITY", label: "Electricity", description: "Street lights, poles, wires, transformers and outages" },
];

export const SUBCATEGORY_OPTIONS = {
  HEALTH: [
    { value: "GARBAGE_COLLECTION", label: "Garbage Collection" },
    { value: "PUBLIC_TOILET", label: "Public Toilet" },
    { value: "MOSQUITO_BREEDING", label: "Mosquito / Breeding" },
    { value: "MEDICAL_WASTE", label: "Medical Waste" },
    { value: "DRAINAGE_HEALTH_HAZARD", label: "Drainage Health Hazard" },
  ],
  WATER: [
    { value: "BROKEN_PIPELINE", label: "Broken Pipeline" },
    { value: "NO_WATER_SUPPLY", label: "No Water Supply" },
    { value: "WATER_TANK_ISSUE", label: "Water Tank Issue" },
    { value: "SEWAGE_MIXING", label: "Sewage Mixing" },
    { value: "WATER_LEAKAGE", label: "Water Leakage" },
  ],
  ROADS: [
    { value: "POTHOLE", label: "Pothole" },
    { value: "FOOTPATH_DAMAGE", label: "Footpath Damage" },
    { value: "ROAD_BLOCKAGE", label: "Road Blockage" },
    { value: "STORMWATER_DRAIN", label: "Stormwater Drain" },
    { value: "TRAFFIC_SIGNAL_ROAD_SAFETY", label: "Traffic Signal / Road Safety" },
  ],
  ELECTRICITY: [
    { value: "STREET_LIGHT", label: "Street Light" },
    { value: "ELECTRIC_POLE", label: "Electric Pole" },
    { value: "TRANSFORMER_ISSUE", label: "Transformer Issue" },
    { value: "POWER_LINE_DANGER", label: "Power Line Danger" },
    { value: "POWER_OUTAGE", label: "Power Outage" },
  ],
} as const;

export const SUBCATEGORY_VALUES = [
  "GARBAGE_COLLECTION",
  "PUBLIC_TOILET",
  "MOSQUITO_BREEDING",
  "MEDICAL_WASTE",
  "DRAINAGE_HEALTH_HAZARD",
  "BROKEN_PIPELINE",
  "NO_WATER_SUPPLY",
  "WATER_TANK_ISSUE",
  "SEWAGE_MIXING",
  "WATER_LEAKAGE",
  "POTHOLE",
  "FOOTPATH_DAMAGE",
  "ROAD_BLOCKAGE",
  "STORMWATER_DRAIN",
  "TRAFFIC_SIGNAL_ROAD_SAFETY",
  "STREET_LIGHT",
  "ELECTRIC_POLE",
  "TRANSFORMER_ISSUE",
  "POWER_LINE_DANGER",
  "POWER_OUTAGE",
] as const;

export const STATUS_VALUES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "ESCALATED"] as const;

export type ComplaintStatus = typeof STATUS_VALUES[number];

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  SANITATION: "Health",
  PUBLIC_HEALTH: "Health",
  WATER_SUPPLY: "Water",
  OTHERS: "Other",
  OTHER: "Other",
};

const LEGACY_CATEGORY_VALUES: Record<string, ComplaintCategory> = {
  SANITATION: "HEALTH",
  PUBLIC_HEALTH: "HEALTH",
  WATER_SUPPLY: "WATER",
  OTHER: "HEALTH",
  OTHERS: "HEALTH",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Finished",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

export function getCategoryLabel(category?: string | null) {
  if (!category) return "Uncategorized";
  return COMPLAINT_CATEGORIES.find((item) => item.value === category)?.label || LEGACY_CATEGORY_LABELS[category] || category;
}

export function normalizeCategoryValue(category?: string | null): ComplaintCategory {
  if (category && CATEGORY_VALUES.includes(category as ComplaintCategory)) {
    return category as ComplaintCategory;
  }

  return category ? LEGACY_CATEGORY_VALUES[category] || "HEALTH" : "HEALTH";
}

export function getSubcategoryLabel(subcategory?: string | null) {
  if (!subcategory) return "General Issue";
  const options = Object.values(SUBCATEGORY_OPTIONS).flat();
  return options.find((item) => item.value === subcategory)?.label || subcategory.replace(/_/g, " ");
}

export function getStatusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] || status.replace(/_/g, " ");
}
