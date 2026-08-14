import { QADiscipline } from "@/generated/prisma/enums";

export { QADiscipline };

// Coverage is tracked by discipline — a higher-level grouping than the real
// Area taxonomy (see the Area model) that bugs and test cases are tagged
// with. Each Area optionally maps onto one discipline via Area.discipline;
// a discipline with no mapped areas yet (or no test cases in its mapped
// areas) reports as genuinely uncovered rather than being hidden or faked —
// that gap is the whole point of the coverage page.
export const QA_DISCIPLINE_ORDER: QADiscipline[] = [
  QADiscipline.GAMEPLAY,
  QADiscipline.UI,
  QADiscipline.AUDIO,
  QADiscipline.PERFORMANCE,
  QADiscipline.NETWORKING,
  QADiscipline.ACCESSIBILITY,
  QADiscipline.LOCALIZATION,
];

export const QA_DISCIPLINE_META: Record<QADiscipline, { label: string }> = {
  GAMEPLAY: { label: "Gameplay" },
  UI: { label: "UI" },
  AUDIO: { label: "Audio" },
  PERFORMANCE: { label: "Performance" },
  NETWORKING: { label: "Networking" },
  ACCESSIBILITY: { label: "Accessibility" },
  LOCALIZATION: { label: "Localization" },
};
