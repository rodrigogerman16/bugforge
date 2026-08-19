import { inputClass, labelClass } from "@/components/bugs/bug-create-form-shared";
import type { AreaSummary, TagSummary } from "@/lib/db";

export function BugCreateAreaTagsFields({
  areaId,
  onAreaChange,
  areas,
  tags,
  selectedTagIds,
  onToggleTag,
}: {
  areaId: string;
  onAreaChange: (areaId: string) => void;
  areas: AreaSummary[];
  tags: TagSummary[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
}) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor="bug-area">Area</label>
        <select id="bug-area" value={areaId} onChange={(e) => onAreaChange(e.target.value)} className={inputClass}>
          <option value="">No area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>Tags</legend>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const active = selectedTagIds.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => onToggleTag(t.id)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={
                  active
                    ? { backgroundColor: `${t.color}26`, color: t.color, borderColor: `${t.color}66` }
                    : { borderColor: "var(--bf-border)", color: "var(--bf-ink-secondary)" }
                }
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
