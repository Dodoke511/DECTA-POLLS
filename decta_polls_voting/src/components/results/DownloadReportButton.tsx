"use client";

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface DownloadReportButtonProps {
  tenantSlug: string;
  electionSlug: string;
  primaryColor?: string;
}

export function DownloadReportButton({ tenantSlug, electionSlug, primaryColor = '#5D44F8' }: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/results/export/csv`);
      if (!res.ok) throw new Error('Failed to download report');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${electionSlug}-results-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border-2 bg-white px-6 py-3 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
      style={{ borderColor: primaryColor, color: primaryColor }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download CSV Report
    </button>
  );
}
