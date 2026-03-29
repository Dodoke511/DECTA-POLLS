"use client";

import { useEffect, useState } from "react";

export function BallotCastAsOfLine({ className }: { className?: string }) {
  const [line, setLine] = useState("Total Ballot Cast · …");

  useEffect(() => {
    const d = new Date();
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setLine(`Total Ballot Cast · Today at ${time}`);
  }, []);

  return <p className={className}>{line}</p>;
}
