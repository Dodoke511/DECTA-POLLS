"use client";

import React from "react";

export function BallotCastAsOfLine({
  className,
  asOf,
}: {
  className?: string;
  asOf?: string | null;
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
    return `Total Ballot Cast · ${dateLabel} at ${time}`;
  })();

  return <p className={className}>{line}</p>;
}
