"use client";

import React, { useState } from "react";
import { IconDownload, IconCheck } from "./Icons";

type VerificationActionsProps = {
  tenantId: string;
  tenantEmail: string;
  tenantOrganization: string;
  verificationUrl: string | null;
  isVerified: boolean;
};

export function VerificationDownloadAction({
  verificationUrl,
  verificationFileName,
}: {
  verificationUrl: string | null;
  verificationFileName: string | null;
}) {
  if (!verificationUrl) return null;

  return (
    <a
      href={verificationUrl}
      rel="noopener noreferrer"
      download={verificationFileName ?? undefined}
      title={verificationFileName ? `Download ${verificationFileName}` : "Download verification file"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <IconDownload className="h-5 w-5" />
    </a>
  );
}

export function VerificationEmailAction({
  tenantId,
  tenantEmail,
  tenantOrganization,
  verificationUrl,
  isVerified,
}: VerificationActionsProps) {
  const [localVerified, setLocalVerified] = useState(isVerified);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSendEmail = async () => {
    try {
      setStatus("sending");
      setMessage("");

      const response = await fetch("/api/send_verification_email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId,
          email: tenantEmail,
          organization: tenantOrganization,
          verificationUrl,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Failed to send email.");
      }

      setStatus("sent");
      setMessage("Email sent.");
      setLocalVerified(true);
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3500);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send email.");
    }
  };

  if (!verificationUrl || localVerified) return null;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleSendEmail}
        disabled={status === "sending"}
        title="Send verification email"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6ee7a0] transition hover:bg-[#2ecc71]/15 hover:text-[#baf8d1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconCheck className="h-5 w-5" />
      </button>

      {message && (
        <span className={`text-[11px] ${status === "sent" ? "text-[#6ee7a0]" : "text-red-300"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
