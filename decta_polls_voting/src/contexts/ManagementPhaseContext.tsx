"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RuntimePhase, PhaseStatus } from '@/lib/workflow/PhaseResolverService';
import { resolvePhaseStatusClient } from '@/lib/workflow/phase-guards';

export interface ManagementPhaseState {
  /** The currently active runtime phase (from PhaseResolverService) */
  currentPhase: RuntimePhase | null;
  /** Resolved status of the current phase */
  phaseStatus: PhaseStatus | null;
  /** All election phases with DB timestamps */
  allPhases: (RuntimePhase & { resolvedStatus: PhaseStatus })[];
  /** The active election's ID */
  electionId: string | null;
  /** The election status (DRAFT, PUBLISHED, ACTIVE, COMPLETED) */
  electionStatus: string | null;
  /** Whether phase data is still loading */
  isLoading: boolean;
  /** Re-fetch phase data from the server */
  refreshPhase: () => Promise<void>;
}

const ManagementPhaseContext = createContext<ManagementPhaseState>({
  currentPhase: null,
  phaseStatus: null,
  allPhases: [],
  electionId: null,
  electionStatus: null,
  isLoading: true,
  refreshPhase: async () => {},
});

interface ProviderProps {
  children: React.ReactNode;
}

export function ManagementPhaseProvider({ children }: ProviderProps) {
  const [currentPhase, setCurrentPhase] = useState<RuntimePhase | null>(null);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus | null>(null);
  const [allPhases, setAllPhases] = useState<(RuntimePhase & { resolvedStatus: PhaseStatus })[]>([]);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [electionStatus, setElectionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPhaseData = useCallback(async () => {
    try {
      const tenantId = sessionStorage.getItem('tenantUserId');
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      // 1. Find the active election
      const electionsRes = await fetch(`/api/get_tenant_elections?tenantId=${tenantId}`);
      const electionsData = await electionsRes.json();
      const elections = electionsData?.elections ?? [];
      const activeElection = elections.find((e: any) => e.status === 'ACTIVE')
        || elections.find((e: any) => e.status === 'PUBLISHED')
        || null;

      if (!activeElection) {
        setIsLoading(false);
        return;
      }

      setElectionId(activeElection.id);
      setElectionStatus(activeElection.status);

      // 2. Fetch current phase via PhaseResolverService endpoint
      const [phaseRes, allPhasesRes] = await Promise.all([
        fetch(`/api/workflow/current_phase?electionId=${activeElection.id}`),
        fetch(`/api/get_election_phases?electionId=${activeElection.id}`)
      ]);

      const phaseData = await phaseRes.json();
      const allPhasesData = await allPhasesRes.json();

      // 3. Resolve all phases client-side
      const now = new Date();
      const resolvedPhases = (allPhasesData.phases ?? []).map((p: RuntimePhase) => ({
        ...p,
        resolvedStatus: resolvePhaseStatusClient(p, now),
      }));
      setAllPhases(resolvedPhases);

      // 4. Set current active phase
      if (phaseData.phase_type) {
        const matchingPhase = resolvedPhases.find(
          (p: any) => p.phase_type === phaseData.phase_type
        );
        if (matchingPhase) {
          setCurrentPhase(matchingPhase);
          setPhaseStatus(matchingPhase.resolvedStatus);
        }
      }
    } catch (err) {
      console.error('[ManagementPhaseContext] Failed to load phase data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhaseData();
  }, [fetchPhaseData]);

  return (
    <ManagementPhaseContext.Provider value={{
      currentPhase,
      phaseStatus,
      allPhases,
      electionId,
      electionStatus,
      isLoading,
      refreshPhase: fetchPhaseData,
    }}>
      {children}
    </ManagementPhaseContext.Provider>
  );
}

export function useManagementPhase() {
  return useContext(ManagementPhaseContext);
}
