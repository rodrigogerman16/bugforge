"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateQualityGate } from "@/app/settings/actions";
import { METRIC_LABEL, formatRequirement } from "@/lib/release-readiness";
import type { GateOperator, QualityGateMetric } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const OPERATOR_OPTIONS: { value: GateOperator; label: string }[] = [
  { value: "LESS_THAN", label: "< less than" },
  { value: "LESS_THAN_OR_EQUAL", label: "≤ at most" },
  { value: "GREATER_THAN", label: "> greater than" },
  { value: "GREATER_THAN_OR_EQUAL", label: "≥ at least" },
  { value: "EQUAL", label: "= exactly" },
];

const inputClass =
  "rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2 py-1.5 text-[13px] text-[color:var(--bf-ink-primary)] outline-none focus:border-[color:var(--bf-border-strong)] disabled:opacity-50";

export type QualityGateRowData = {
  id: string;
  metric: QualityGateMetric;
  operator: GateOperator;
  threshold: number;
  enabled: boolean;
};

function GateRow({ gate, readOnly }: { gate: QualityGateRowData; readOnly: boolean }) {
  const [operator, setOperator] = useState(gate.operator);
  const [threshold, setThreshold] = useState(String(gate.threshold));
  const [enabled, setEnabled] = useState(gate.enabled);
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  function save(next: { operator?: GateOperator; threshold?: number; enabled?: boolean }) {
    startTransition(async () => {
      await updateQualityGate(gate.id, next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !enabled && "opacity-50")}>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isPending || readOnly}
          onChange={(e) => {
            setEnabled(e.target.checked);
            save({ enabled: e.target.checked });
          }}
          className="h-3.5 w-3.5 shrink-0 accent-[color:var(--bf-brand)]"
        />
        <span className="w-36 shrink-0 text-[13px] font-medium text-[color:var(--bf-ink-primary)]">
          {METRIC_LABEL[gate.metric]}
        </span>
      </label>

      <span className="text-[12px] text-[color:var(--bf-ink-muted)]">Must be</span>

      <select
        value={operator}
        disabled={isPending || !enabled || readOnly}
        onChange={(e) => {
          const value = e.target.value as GateOperator;
          setOperator(value);
          save({ operator: value });
        }}
        className={inputClass}
      >
        {OPERATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        step="0.1"
        value={threshold}
        disabled={isPending || !enabled || readOnly}
        onChange={(e) => setThreshold(e.target.value)}
        onBlur={() => {
          const parsed = Number(threshold);
          if (!Number.isNaN(parsed)) save({ threshold: parsed });
        }}
        className={cn(inputClass, "w-20")}
      />

      <span className="text-[12px] text-[color:var(--bf-ink-muted)]">
        {gate.metric === "CRITICAL_BUGS" ? "bugs" : "%"}
      </span>

      <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[color:var(--bf-ink-muted)]">
        {isPending && <Loader2 size={11} className="animate-spin" />}
        {!isPending && justSaved && (
          <span className="flex items-center gap-1 text-[color:var(--bf-status-good)]">
            <Check size={11} /> Saved
          </span>
        )}
        {!isPending && !justSaved && enabled && formatRequirement(operator, Number(threshold) || 0, gate.metric)}
      </span>
    </div>
  );
}

export function QualityGatesForm({ gates, readOnly = false }: { gates: QualityGateRowData[]; readOnly?: boolean }) {
  return (
    <div className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)]">
      {gates.map((gate) => (
        <GateRow key={gate.id} gate={gate} readOnly={readOnly} />
      ))}
    </div>
  );
}
