"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, ChevronDown, ChevronUp, Download, FileText, Loader2, Maximize2, UserRound, UsersRound, X } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';

type LayoutStyle = 'grid' | 'list' | 'detailed';

interface CandidateField {
  label: string;
  value: string;
}

interface CandidateSection {
  id: string;
  label: string;
  displayStyle: 'rows' | 'prose' | 'tags';
  fields: CandidateField[];
}

interface CandidateDocument {
  label: string;
  url: string;
}

interface PublishedCandidate {
  id: string;
  filedDate?: string | null;
  name: string;
  position?: string | null;
  photoUrl?: string | null;
  header: {
    department?: string | null;
    course?: string | null;
    tagline?: string | null;
  };
  sections: CandidateSection[];
  documents: CandidateDocument[];
}

interface CandidatesResponse {
  config: {
    layout_style: LayoutStyle;
    show_photo: boolean;
  } | null;
  candidates: PublishedCandidate[];
  isConfigured: boolean;
  error?: string;
}

function CandidateAvatar({ candidate, onPhotoClick }: { candidate: PublishedCandidate; onPhotoClick: (candidate: PublishedCandidate) => void }) {
  if (candidate.photoUrl) {
    return (
      <button
        type="button"
        onClick={() => onPhotoClick(candidate)}
        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/60 bg-white/60 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-4 ring-white/40 transition hover:scale-[1.03] hover:ring-[var(--tenant-primary)]/30"
        aria-label={`Expand ${candidate.name} profile photo`}
      >
        <Image
          src={candidate.photoUrl}
          alt={`${candidate.name} profile photo`}
          width={96}
          height={96}
          className="h-full w-full object-cover"
          unoptimized
        />
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5" />
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/55 text-[var(--tenant-primary)] shadow-[0_18px_45px_rgba(15,23,42,0.12)] ring-4 ring-white/35 backdrop-blur-xl">
      <UserRound className="h-10 w-10" />
    </div>
  );
}

function CandidateSections({ sections, documents }: { sections: CandidateSection[]; documents: CandidateDocument[] }) {
  if (sections.length === 0 && documents.length === 0) return null;

  return (
    <div className="mt-5 space-y-4 border-t border-white/65 pt-5">
      {sections.map(section => (
        <section
          key={section.id}
          className="overflow-hidden rounded-2xl border border-white/65 bg-white/40 shadow-sm backdrop-blur-xl"
        >
          <div className="space-y-4 p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">{section.label}</h3>

            {section.displayStyle === 'tags' ? (
              <div className="flex flex-wrap gap-2">
                {section.fields.map(field => (
                  <span key={`${section.id}-${field.label}`} className="rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md">
                    {field.value}
                  </span>
                ))}
              </div>
            ) : section.displayStyle === 'prose' ? (
              <div className="space-y-3">
                {section.fields.map(field => (
                  <p key={`${section.id}-${field.label}`} className="text-sm leading-relaxed text-slate-700">
                    {field.value}
                  </p>
                ))}
              </div>
            ) : (
              <dl className="space-y-3">
                {section.fields.map(field => (
                  <div key={`${section.id}-${field.label}`} className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] items-center gap-4">
                    <dt className="min-w-0 text-[11px] font-black uppercase tracking-wider text-slate-400">{field.label}</dt>
                    <dd className="justify-self-end whitespace-normal text-right text-sm font-black text-slate-800">{field.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      ))}

      {documents.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-white/65 bg-white/40 p-5 shadow-sm backdrop-blur-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Documents</h3>
          <div className="flex flex-wrap gap-2">
            {documents.map(document => (
              <a
                key={`${document.label}-${document.url}`}
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/55 px-3 py-2 text-xs font-black text-slate-700 shadow-sm backdrop-blur-md transition hover:border-[var(--tenant-secondary)] hover:text-[var(--tenant-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
                {document.label}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  isDetailed,
  isExpanded,
  onToggleDetails,
  onPhotoClick,
}: {
  candidate: PublishedCandidate;
  isDetailed: boolean;
  isExpanded: boolean;
  onToggleDetails: () => void;
  onPhotoClick: (candidate: PublishedCandidate) => void;
}) {
  const hasDetails = candidate.sections.length > 0 || candidate.documents.length > 0;
  const showDetails = hasDetails && (isDetailed || isExpanded);
  const filedDate = candidate.filedDate
    ? new Date(candidate.filedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <article className="relative self-start overflow-hidden rounded-[28px] border border-white/65 bg-white/50 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-white hover:bg-white/65 hover:shadow-[0_32px_90px_rgba(15,23,42,0.18)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.08]" />
      <div className="relative">
        <div>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <CandidateAvatar candidate={candidate} onPhotoClick={onPhotoClick} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">
                {candidate.position || 'Candidate'}
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{candidate.name}</h2>
              {candidate.header.tagline && (
                <p className="mt-2 text-sm font-semibold text-slate-600">{candidate.header.tagline}</p>
              )}
              {filedDate && (
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Filed {filedDate}</p>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {[candidate.header.department, candidate.header.course].filter(Boolean).map(item => (
                  <span key={item} className="rounded-full border border-white/60 bg-white/45 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {!isDetailed && hasDetails && (
            <button
              type="button"
              onClick={onToggleDetails}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur-md transition hover:border-[var(--tenant-secondary)] hover:bg-white/75 hover:text-[var(--tenant-primary)]"
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Hide Details' : 'View Details'}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>

        {showDetails && <CandidateSections sections={candidate.sections} documents={candidate.documents} />}
      </div>
    </article>
  );
}

export default function CandidatesListingPage() {
  const { userContext, siteConfig, tenant, election } = useElectionPublic();
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [photoPreviewCandidate, setPhotoPreviewCandidate] = useState<PublishedCandidate | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      try {
        setLoading(true);
        setError('');
        const tenantSlug = encodeURIComponent(tenant.slug);
        const electionSlug = encodeURIComponent(election.slug);
        const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/candidates`);
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error || 'Failed to load candidates.');
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load candidates.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [tenant.slug, election.slug]);

  if (userContext?.isVoter && siteConfig?.voter_can_view_candidates === false) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-6 py-12">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <AlertCircle className="mb-4 h-10 w-10 text-[var(--tenant-primary)]" />
          <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Candidate listing is currently restricted.</p>
        </div>
      </div>
    );
  }

  const layout = data?.config?.layout_style || 'grid';
  const isDetailed = layout === 'detailed';
  const candidates = data?.candidates || [];
  const shouldShowDetailsByDefault = isDetailed || layout === 'list';
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const toggleCandidateDetails = (candidateId: string) => {
    setExpandedCandidateId(prev => prev === candidateId ? null : candidateId);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-[30px] border border-white/65 bg-white/35 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="h-1.5 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
          <div className="p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Candidates</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Meet the Candidates</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
            Browse the approved candidates for {siteConfig?.public_title || election.title}.
          </p>
          </div>
        </div>

        {loading && (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--tenant-primary)]" />
            <p className="text-sm font-bold">Loading approved candidates...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h2 className="text-xl font-black text-slate-900">Unable to Load Candidates</h2>
            <p className="max-w-md text-sm font-semibold text-slate-500">{error}</p>
          </div>
        )}

        {!loading && !error && data?.isConfigured === false && candidates.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <FileText className="h-10 w-10 text-[var(--tenant-primary)]" />
            <h2 className="text-xl font-black text-slate-900">Publication Not Configured</h2>
            <p className="max-w-md text-sm font-semibold text-slate-500">
              Candidate profiles will appear here once the publication phase configuration has been saved.
            </p>
          </div>
        )}

        {!loading && !error && data?.isConfigured !== false && candidates.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <UsersRound className="h-10 w-10 text-[var(--tenant-primary)]" />
            <h2 className="text-xl font-black text-slate-900">No Approved Candidates Yet</h2>
            <p className="max-w-md text-sm font-semibold text-slate-500">
              Candidates will be listed here after the election committee approves their applications.
            </p>
          </div>
        )}

        {!loading && !error && candidates.length > 0 && (
          <div className={shouldShowDetailsByDefault ? 'space-y-4' : 'grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3'}>
            {candidates.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                isDetailed={shouldShowDetailsByDefault}
                isExpanded={expandedCandidateId === candidate.id}
                onToggleDetails={() => toggleCandidateDetails(candidate.id)}
                onPhotoClick={setPhotoPreviewCandidate}
              />
            ))}
          </div>
        )}
      </div>

      {photoPreviewCandidate?.photoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xl" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close photo preview"
            onClick={() => setPhotoPreviewCandidate(null)}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/20 bg-white/12 p-3 shadow-[0_35px_110px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-2 pb-3 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/55">Candidate Photo</p>
                <h2 className="text-lg font-black">{photoPreviewCandidate.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreviewCandidate(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close photo preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative max-h-[75vh] overflow-hidden rounded-[24px] bg-slate-950/30">
              <Image
                src={photoPreviewCandidate.photoUrl}
                alt={`${photoPreviewCandidate.name} profile photo`}
                width={1200}
                height={900}
                className="max-h-[75vh] w-full object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
