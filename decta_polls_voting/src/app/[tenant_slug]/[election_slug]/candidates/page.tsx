"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, ChevronDown, ChevronUp, Download, FileText, Loader2, Lock, Maximize2, UserRound, UsersRound, X } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { isPhaseReachable } from '@/lib/public-election/phase-utils';

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
  political_party?: string | null;
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

function CandidateAvatar({ 
  candidate, 
  onPhotoClick,
  size = 'md'
}: { 
  candidate: PublishedCandidate; 
  onPhotoClick: (candidate: PublishedCandidate) => void;
  size?: 'sm' | 'md';
}) {
  const isSm = size === 'sm';
  const dimensionsClass = isSm ? 'h-16 w-16' : 'h-24 w-24';
  const ringClass = isSm ? 'ring-2 ring-white/30' : 'ring-4 ring-white/40';
  const shadowClass = isSm ? 'shadow-md' : 'shadow-[0_18px_45px_rgba(15,23,42,0.18)]';
  const avatarSize = isSm ? 64 : 96;

  if (candidate.photoUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPhotoClick(candidate);
        }}
        className={`group relative shrink-0 overflow-hidden rounded-full border border-white/60 bg-white/60 transition hover:scale-[1.03] hover:ring-[var(--tenant-primary)]/20 ${dimensionsClass} ${shadowClass} ${ringClass}`}
        aria-label={`Expand ${candidate.name} profile photo`}
      >
        <Image
          src={candidate.photoUrl}
          alt={`${candidate.name} profile photo`}
          width={avatarSize}
          height={avatarSize}
          className="h-full w-full object-cover"
          unoptimized
        />
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/55 text-[var(--tenant-primary)] backdrop-blur-xl ${dimensionsClass} ${shadowClass} ${ringClass}`}>
      <UserRound className={isSm ? "h-6 w-6" : "h-10 w-10"} />
    </div>
  );
}

function CandidateSections({ 
  sections, 
  documents,
  isDetailed,
  isListView = false
}: { 
  sections: CandidateSection[]; 
  documents: CandidateDocument[];
  isDetailed: boolean;
  isListView?: boolean;
}) {
  if (sections.length === 0 && documents.length === 0) return null;

  return (
    <div className={isListView ? "space-y-3 w-full" : "mt-5 space-y-4 border-t border-white/65 pt-5 w-full"}>
      {sections.map((section, sIdx) => (
        <section
          key={`${section.id}-${sIdx}`}
          className={isListView ? "w-full" : "w-full overflow-hidden rounded-2xl border border-white/65 bg-white/40 shadow-sm backdrop-blur-xl"}
        >
          <div className={isListView ? "space-y-2 w-full" : "space-y-4 p-3.5 sm:p-4.5 w-full"}>
            {!isListView && (
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">{section.label}</h3>
            )}

            {section.displayStyle === 'tags' ? (
              <div className="flex flex-wrap gap-1.5 w-full">
                {section.fields.map((field, idx) => (
                  <span key={`${section.id}-${field.label}-${idx}`} className="rounded-full border border-slate-200/40 bg-white/50 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md">
                    {field.value}
                  </span>
                ))}
              </div>
            ) : section.displayStyle === 'prose' ? (
              <div className="space-y-2.5 w-full">
                {section.fields.map((field, idx) => (
                  <p key={`${section.id}-${field.label}-${idx}`} className="text-sm leading-relaxed text-slate-600 font-medium w-full">
                    {field.value}
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5 w-full">
                {section.fields.map((field, idx) => {
                  const isLongText = field.value.length > 50 || 
                                     field.value.includes('\n') || 
                                     field.label.toLowerCase().includes('statement') || 
                                     field.label.toLowerCase().includes('description') || 
                                     field.label.toLowerCase().includes('bio') ||
                                     field.label.toLowerCase().includes('platform');
                  
                  if (isLongText) {
                    return (
                      <div 
                        key={`${section.id}-${field.label}-${idx}`} 
                        className={`flex flex-col items-stretch gap-1.5 py-3 w-full ${idx === 0 ? 'pt-0.5' : 'border-t border-slate-100'} ${idx === section.fields.length - 1 ? 'pb-0' : ''}`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left w-full">
                          {field.label}
                        </div>
                        <div className="w-full whitespace-pre-line text-sm font-medium leading-relaxed text-slate-650 text-left bg-slate-50/40 rounded-xl p-2.5 sm:p-3.5 border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] break-words">
                          {field.value}
                        </div>
                      </div>
                    );
                  }

                  if (!isListView) {
                    // Grid View Cards (expanded standard cards): Stack vertically (labels above values)
                    // so that they never squeeze horizontally in 3-column layouts.
                    return (
                      <div 
                        key={`${section.id}-${field.label}-${idx}`} 
                        className={`flex flex-col items-stretch gap-1 py-2.5 w-full ${idx === 0 ? 'pt-0.5' : 'border-t border-slate-100'} ${idx === section.fields.length - 1 ? 'pb-0' : ''}`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left w-full">
                          {field.label}
                        </div>
                        <div className="whitespace-normal text-left text-sm font-semibold text-slate-700 break-words w-full">
                          {field.value}
                        </div>
                      </div>
                    );
                  }

                  // List View Cards (where isListView is true): Use side-by-side grid
                  return (
                    <div 
                      key={`${section.id}-${field.label}-${idx}`} 
                      className={`flex flex-col sm:grid sm:grid-cols-[7.5rem_1fr] md:grid-cols-[9rem_1fr] gap-0.5 sm:gap-4 py-2 w-full ${idx === 0 ? 'pt-0.5' : 'border-t border-slate-100'} ${idx === section.fields.length - 1 ? 'pb-0' : ''}`}
                    >
                      <div className="min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left self-start sm:self-center">
                        {field.label}
                      </div>
                      <div className="whitespace-normal text-left text-sm font-semibold text-slate-700 break-words w-full">
                        {field.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}

      {documents.length > 0 && (
        <section className={isListView ? "space-y-2 pt-3 border-t border-slate-100" : "space-y-3 rounded-2xl border border-white/65 bg-white/40 p-5 shadow-sm backdrop-blur-xl"}>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Documents</h3>
          <div className="flex flex-wrap gap-2">
            {documents.map((document, idx) => (
              <a
                key={`${document.label}-${document.url}-${idx}`}
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition hover:border-[var(--tenant-secondary)] hover:text-[var(--tenant-primary)]"
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
  layoutStyle,
  isExpanded,
  onToggleDetails,
  onPhotoClick,
}: {
  candidate: PublishedCandidate;
  layoutStyle: LayoutStyle;
  isExpanded: boolean;
  onToggleDetails: () => void;
  onPhotoClick: (candidate: PublishedCandidate) => void;
}) {
  const hasDetails = candidate.sections.length > 0 || candidate.documents.length > 0;
  const isDetailed = layoutStyle === 'detailed';
  const isList = layoutStyle === 'list';
  const isGrid = layoutStyle === 'grid';
  
  // Show details if layout style is 'detailed', or if it's expanded by the user
  const showDetails = hasDetails && (isDetailed || isExpanded);
  
  const filedDate = candidate.filedDate
    ? new Date(candidate.filedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const isListOrDetailed = isList || isDetailed;

  // For collapsible list view: clicking the entire card toggles expansion
  const handleCardClick = () => {
    if (isList && hasDetails) {
      onToggleDetails();
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative overflow-hidden rounded-[28px] border border-white/65 bg-white/80 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition w-full 
        ${isList && hasDetails ? 'cursor-pointer' : ''} 
        ${isListOrDetailed ? 'py-4 px-4 sm:px-6 lg:py-5 lg:px-8' : 'p-3.5 sm:p-6'} 
        hover:-translate-y-1 hover:border-white hover:bg-white/65 hover:shadow-[0_32px_90px_rgba(15,23,42,0.18)]
      `}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.08]" />
      <div className="relative w-full">
        {isListOrDetailed ? (
          /* List/Detailed View Layout: Top header row, bottom full-width details section */
          <div className="flex flex-col w-full">
            {/* Header Row: Avatar and basic information (aligned horizontally, flex wrap for responsiveness) */}
            <div className="flex flex-row items-center gap-4 w-full pr-8">
              <CandidateAvatar candidate={candidate} onPhotoClick={onPhotoClick} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--tenant-primary)]">
                  {candidate.position || 'Candidate'}
                </p>
                <h2 className="mt-0.5 text-2xl font-black text-slate-900 tracking-tight leading-none">{candidate.name}</h2>
                {candidate.header.tagline && (
                  <p className="mt-1 text-sm font-semibold text-slate-605 break-words leading-tight">{candidate.header.tagline}</p>
                )}
                {filedDate && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filed {filedDate}</p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[candidate.header.department, candidate.header.course].filter(Boolean).map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full border border-slate-200/30 bg-slate-50/40 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm backdrop-blur-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Collapsed chevron on the right side of the header row */}
              {!showDetails && hasDetails && (
                <div className="hidden lg:flex shrink-0 items-center justify-end text-slate-400 group-hover:text-[var(--tenant-primary)] transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider mr-2.5 opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/50 shadow-sm backdrop-blur-sm transition-all group-hover:border-[var(--tenant-primary)] group-hover:bg-white group-hover:scale-105 active:scale-95">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile/Tablet view helper when card is collapsed */}
            {!showDetails && hasDetails && (
              <div className="lg:hidden mt-3.5 flex justify-center w-full">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/50 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm transition-all group-hover:border-[var(--tenant-primary)]">
                  <span>View Details</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* Expanded details rendered underneath the header row, spanning full width */}
            {showDetails && (
              <div className="mt-5 border-t border-slate-200/60 pt-5 w-full">
                <CandidateSections 
                  sections={candidate.sections} 
                  documents={candidate.documents} 
                  isDetailed={true} 
                  isListView={true} 
                />
              </div>
            )}
          </div>
        ) : (
          /* Grid View Layout: standard vertical layout */
          <div className="w-full">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left w-full">
              <CandidateAvatar candidate={candidate} onPhotoClick={onPhotoClick} />
              <div className="min-w-0 flex-1 w-full">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--tenant-primary)]">
                  {candidate.position || 'Candidate'}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">{candidate.name}</h2>
                {candidate.header.tagline && (
                  <p className="mt-1.5 text-sm font-semibold text-slate-605 break-words leading-relaxed">{candidate.header.tagline}</p>
                )}
                {filedDate && (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filed {filedDate}</p>
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {[candidate.header.department, candidate.header.course].filter(Boolean).map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full border border-slate-200/30 bg-slate-50/40 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm backdrop-blur-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {hasDetails && (
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

            {showDetails && (
              <CandidateSections 
                sections={candidate.sections} 
                documents={candidate.documents} 
                isDetailed={false} 
                isListView={false} 
              />
            )}
          </div>
        )}

        {/* If in expanded list/detailed view, add a floating top-right toggle button to let users easily close it */}
        {isListOrDetailed && hasDetails && showDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDetails();
            }}
            className="absolute right-0 top-0 lg:right-1 lg:top-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/50 bg-white/50 text-slate-500 shadow-sm backdrop-blur-sm transition-all hover:border-[var(--tenant-primary)] hover:bg-white hover:text-[var(--tenant-primary)] hover:scale-105 active:scale-95"
            aria-label="Collapse details"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

export default function CandidatesListingPage() {
  const { userContext, siteConfig, tenant, election, phases } = useElectionPublic();
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

  const isPublicationReachable = isPhaseReachable(phases, 'publication');

  if (!isPublicationReachable) {
    const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/65 bg-white/75 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-[var(--tenant-primary)] shadow-sm backdrop-blur-md">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">You&apos;ll meet them soon</h2>
            <p className="mt-2 text-sm font-semibold text-slate-650 leading-relaxed">
              Candidate profiles will be visible once the publication phase begins.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
  const isList = layout === 'list';
  const candidates = data?.candidates || [];
  const isListOrDetailed = isDetailed || isList;
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const toggleCandidateDetails = (candidateId: string) => {
    setExpandedCandidateId(prev => prev === candidateId ? null : candidateId);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

      <div className="relative mx-auto max-w-7xl px-3 py-10 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-[30px] border border-white/65 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="h-1.5 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Candidates</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Meet the Candidates</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
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
          <div className={
            isListOrDetailed 
              ? 'space-y-4 w-full' 
              : candidates.length === 1 
                ? 'grid grid-cols-1 max-w-2xl mx-auto gap-6 w-full'
                : 'grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-2 w-full'
          }>
            {candidates.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                layoutStyle={layout}
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
