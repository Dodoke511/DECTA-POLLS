"use client";

import React, { useState } from "react";

export function BallotCastAsOfLine({ className }: { className?: string }) {
  const [line] = useState(() => {
    const d = new Date();
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `Total Ballot Cast · Today at ${time}`;
  });

  return <p className={className}>{line}</p>;
}
