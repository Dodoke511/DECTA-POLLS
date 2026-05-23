import React, { useState } from 'react';
import { CandidateSelectionCard } from './CandidateSelectionCard';
import { AbstainOption } from './AbstainOption';
import { ReviewScreen } from './ReviewScreen';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface StepByStepBallotProps {
  positions: any[];
  candidates: any[];
  votingConfig: any;
  tenantSlug: string;
  electionSlug: string;
  primaryColor?: string;
  onSubmit: (selections: Record<string, any>) => void;
  isSubmitting: boolean;
}

export function StepByStepBallot({
  positions,
  candidates,
  votingConfig,
  tenantSlug,
  electionSlug,
  primaryColor = '#5D44F8',
  onSubmit,
  isSubmitting
}: StepByStepBallotProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});
  
  const isReview = currentIndex === positions.length;
  const currentPosition = !isReview ? positions[currentIndex] : null;

  const handleSelect = (candidateId: string) => {
    if (!currentPosition) return;
    setSelections(prev => ({
      ...prev,
      [currentPosition.id]: candidateId
    }));
  };

  const handleAbstain = () => {
    if (!currentPosition) return;
    setSelections(prev => ({
      ...prev,
      [currentPosition.id]: 'abstain'
    }));
  };

  const nextStep = () => {
    if (currentIndex < positions.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isReview) {
    return (
      <ReviewScreen
        selections={selections}
        positions={positions}
        candidates={candidates}
        onSubmit={() => onSubmit(selections)}
        onEdit={(idx) => setCurrentIndex(idx)}
        isSubmitting={isSubmitting}
        primaryColor={primaryColor}
        tenantSlug={tenantSlug}
      />
    );
  }

  if (!currentPosition) return null;

  const positionCandidates = candidates.filter(c => c.position_id === currentPosition.id);
  const currentSelection = selections[currentPosition.id];
  const canProceed = !!currentSelection || !votingConfig?.require_all_positions; // assuming a requirement flag, or default allow empty

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>Position {currentIndex + 1} of {positions.length}</span>
          <span>{Math.round((currentIndex / positions.length) * 100)}% Complete</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentIndex / positions.length) * 100}%`, backgroundColor: primaryColor }}
          />
        </div>
      </div>

      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black text-slate-900">{currentPosition.title}</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Select {currentPosition.seats_available > 1 ? `up to ${currentPosition.seats_available} candidates` : 'one candidate'}
        </p>
      </div>

      <div className="space-y-4">
        {positionCandidates.map(candidate => (
          <CandidateSelectionCard
            key={candidate.id}
            candidateId={candidate.id}
            name={candidate.name}
            partyName={candidate.party_name}
            photoUrl={candidate.photo_url}
            isSelected={currentSelection === candidate.id}
            onSelect={() => handleSelect(candidate.id)}
            primaryColor={primaryColor}
          />
        ))}

        {votingConfig?.abstain_allowed !== false && (
          <AbstainOption
            isSelected={currentSelection === 'abstain'}
            onSelect={handleAbstain}
            primaryColor={primaryColor}
          />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
        <button
          onClick={prevStep}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </button>

        <button
          onClick={nextStep}
          disabled={!currentSelection}
          className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}40` }}
        >
          {currentIndex === positions.length - 1 ? 'Review Ballot' : 'Next'}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
