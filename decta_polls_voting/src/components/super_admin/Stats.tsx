"use client";

import React from "react";

export type CompletedElectionPeriod = "year" | "month" | "week" | "day";

const PERIOD_OPTIONS: { value: CompletedElectionPeriod; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const PERIOD_LABELS: Record<CompletedElectionPeriod, string> = {
  year: "This year",
  month: "This month",
  week: "Last 7 days",
  day: "Today",
};

export function CompletedElectionsPeriodFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: CompletedElectionPeriod;
  onChange: (period: CompletedElectionPeriod) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
      {PERIOD_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "super-admin-nav-item-active"
                : "super-admin-button text-white/70 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CompletedElectionsAsOfLine({
  className,
  asOf,
  period = "month",
}: {
  className?: string;
  asOf?: string | null;
  period?: CompletedElectionPeriod;
}) {
  const line = (() => {
    const d = asOf ? new Date(asOf) : new Date();
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateLabel = asOf
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "Today";
    return `Completed Elections · ${PERIOD_LABELS[period]} · ${dateLabel} at ${time}`;
  })();

  return <p className={className}>{line}</p>;
}
