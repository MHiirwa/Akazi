// Canonical job types for Akazi (mirrors backend src/constants/jobTypes.js).
// Every place that shows or filters job types imports from here so the list,
// its stored values, and its display labels never drift apart.
export const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERNSHIP", label: "Internship" },
];

export const JOB_TYPE_VALUES = JOB_TYPES.map((t) => t.value);

const LABELS = Object.fromEntries(JOB_TYPES.map((t) => [t.value, t.label]));

// Human label for a stored value; falls back to the raw value if unknown
// (e.g. legacy rows created before the list was centralized).
export function jobTypeLabel(value) {
  return LABELS[value] || value;
}
