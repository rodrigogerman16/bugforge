import { inputClass, labelClass } from "@/components/bugs/bug-create-form-shared";

export function BugCreateReproFields({
  stepsToReproduce,
  onStepsChange,
  expectedResult,
  onExpectedChange,
  actualResult,
  onActualChange,
}: {
  stepsToReproduce: string;
  onStepsChange: (value: string) => void;
  expectedResult: string;
  onExpectedChange: (value: string) => void;
  actualResult: string;
  onActualChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor="bug-steps">Steps to Reproduce</label>
        <textarea
          id="bug-steps"
          value={stepsToReproduce}
          onChange={(e) => onStepsChange(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder={"1. ...\n2. ...\n3. ..."}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="bug-expected">Expected Result</label>
          <textarea id="bug-expected" value={expectedResult} onChange={(e) => onExpectedChange(e.target.value)} rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="bug-actual">Actual Result</label>
          <textarea id="bug-actual" value={actualResult} onChange={(e) => onActualChange(e.target.value)} rows={2} className={inputClass} />
        </div>
      </div>
    </>
  );
}
