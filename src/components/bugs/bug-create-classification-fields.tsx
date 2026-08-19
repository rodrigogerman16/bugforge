import { inputClass, labelClass } from "@/components/bugs/bug-create-form-shared";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { PLATFORM_LABEL } from "@/lib/platform";
import type { BugSeverity, BugPriority, Platform } from "@/generated/prisma/enums";

export function BugCreateClassificationFields({
  severity,
  onSeverityChange,
  priority,
  onPriorityChange,
  platform,
  onPlatformChange,
  availablePlatforms,
}: {
  severity: BugSeverity;
  onSeverityChange: (severity: BugSeverity) => void;
  priority: BugPriority;
  onPriorityChange: (priority: BugPriority) => void;
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  availablePlatforms: Platform[];
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className={labelClass} htmlFor="bug-severity">Severity</label>
        <select
          id="bug-severity"
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as BugSeverity)}
          className={inputClass}
        >
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_META[s].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="bug-priority">Priority</label>
        <select
          id="bug-priority"
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as BugPriority)}
          className={inputClass}
        >
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].code} — {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="bug-platform">Platform</label>
        <select id="bug-platform" value={platform} onChange={(e) => onPlatformChange(e.target.value as Platform)} className={inputClass}>
          {availablePlatforms.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
