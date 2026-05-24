"use client";

import React, { useState } from "react";
import { IconDownload, IconCheck } from "./Icons";

type VerificationActionsProps = {
  tenantId: string;
  tenantEmail: string;
  tenantOrganization: string;
  verificationUrl: string | null;
  isVerified: boolean;
  onStatusUpdate?: (tenantId: string, newStatus: 'APPROVED' | 'REJECTED') => void;
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
      target="_blank"
      rel="noopener noreferrer"
      title={verificationFileName ? `View ${verificationFileName}` : "View verification file"}
      className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <IconDownload className="h-4 w-4 sm:h-5 sm:w-5" />
    </a>
  );
}

/*export function VerificationEmailAction({ //COMMENTED IT FOR NOW AS I FIND NO USE OF IT 
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
        className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-[#6ee7a0] transition hover:bg-[#2ecc71]/15 hover:text-[#baf8d1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconCheck className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {message && (
        <span className={`text-[10px] sm:text-[11px] ${status === "sent" ? "text-[#6ee7a0]" : "text-red-300"}`}>
          {message}
        </span>
      )}
    </div>
  );
}*/

export function TenantMonitoringStatusActions({
  tenantId,
  tenantEmail,
  tenantOrganization,
  verificationUrl,
  isVerified,
  onStatusUpdate,
}: VerificationActionsProps) {
  const [localVerified, setLocalVerified] = useState(isVerified);
  const [localRejected, setLocalRejected] = useState(false);
  const [acceptStatus, setAcceptStatus] = useState<"idle" | "loading" | "error">("idle");
  const [rejectStatus, setRejectStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleAccept = async () => {
    try {
      setAcceptStatus("loading");
      setMessage("");

      //Approve Tenant verification and send verification email
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
        throw new Error(payload.message || "Failed to accept.");
      }

      setLocalVerified(true);
      onStatusUpdate?.(tenantId, 'APPROVED');
    } catch (err) {
      setAcceptStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to accept.");
    }
  };

  const handleReject = async () => {
    try {
      setRejectStatus("loading");
      setMessage("");

      const response = await fetch("/api/reject_tenant_verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Failed to reject.");
      }

      setLocalRejected(true);
      setRejectStatus("idle");
      onStatusUpdate?.(tenantId, 'REJECTED');
    } catch (err) {
      setRejectStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to reject.");
    }
  };

  if (!verificationUrl || localVerified || localRejected) return null;

  const busy = acceptStatus === "loading" || rejectStatus === "loading";

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85] shadow-[0_0_12px_rgba(80,200,120,0.12)] transition hover:bg-[#50C878]/[0.28] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {acceptStatus === "loading" ? "…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-full border border-red-500/55 bg-red-500/[0.15] px-3 py-1 text-xs font-medium text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.12)] transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rejectStatus === "loading" ? "…" : "Reject"}
        </button>
      </div>
      {message && (
        <span className="max-w-[200px] text-center text-[10px] sm:text-[11px] text-red-300">
          {message}
        </span>
      )}
    </div>
  );
}
