const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERNSHIP", label: "Internship" }
];
const JOB_TYPE_VALUES = JOB_TYPES.map((t) => t.value);
export {
  JOB_TYPES,
  JOB_TYPE_VALUES
};
