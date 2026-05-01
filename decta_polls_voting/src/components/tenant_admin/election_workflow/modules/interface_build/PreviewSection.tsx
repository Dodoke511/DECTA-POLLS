import { ExternalLink, Eye } from 'lucide-react';

export function PreviewSection({ 
  electionId, 
  tenantSlug, 
  electionSlug 
}: { 
  electionId: string,
  tenantSlug?: string | null,
  electionSlug?: string | null
}) {
  const handlePreview = () => {
    if (!tenantSlug || !electionSlug) {
      // Fallback to the ID-based route if slugs aren't loaded yet
      window.open(`/preview/${electionId}`, '_blank');
      return;
    }
    window.open(`/${tenantSlug}/${electionSlug}`, '_blank');
  };

  return (
    <div className="bg-[#140B2D]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-[#9A79F8]" />
          <h3 className="text-lg font-bold text-white">Section 5 — Preview</h3>
        </div>
        <p className="text-sm text-white/60">
          Preview how your election site will look to candidates and voters.
        </p>
      </div>

      <button
        onClick={handlePreview}
        className="px-6 py-3 bg-[#A78BFA] hover:bg-[#A78BFA]/90 text-white font-bold rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
      >
        <ExternalLink className="w-4 h-4" />
        Open Election Site Preview
      </button>
    </div>
  );
}
