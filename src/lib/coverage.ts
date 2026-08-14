// QA coverage is tracked by discipline — a higher-level grouping than the
// feature-area taxonomy (AREAS) that bugs and test cases are tagged with.
// Every existing area maps onto exactly one discipline below; a discipline
// with no mapped areas yet (or no test cases in its mapped areas) reports
// as genuinely uncovered rather than being hidden or faked — that gap is
// the whole point of this page.
export const QA_DISCIPLINES = [
  "Gameplay",
  "UI",
  "Audio",
  "Performance",
  "Networking",
  "Accessibility",
  "Localization",
] as const;

export type QADiscipline = (typeof QA_DISCIPLINES)[number];

export const AREA_TO_DISCIPLINE: Record<string, QADiscipline> = {
  Combat: "Gameplay",
  "AI/Enemies": "Gameplay",
  Progression: "Gameplay",
  "Save/Load": "Gameplay",
  Physics: "Gameplay",
  "UI/HUD": "UI",
  Audio: "Audio",
  Rendering: "Performance",
  Networking: "Networking",
  Matchmaking: "Networking",
};
