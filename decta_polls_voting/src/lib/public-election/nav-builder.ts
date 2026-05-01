import { PhaseState, isPhaseActive, isPhaseReachable } from './phase-utils';
import { ElectionUserContext } from './session';

export interface NavItem {
  label: string;
  href: string;
  highlight?: boolean;
}

export function buildRoleAwareNav(
  phases: PhaseState[],
  userContext: ElectionUserContext | null,
  siteConfig: any,
  basePath: string
): NavItem[] {
  const nav: NavItem[] = [];

  // Home is always available
  nav.push({ label: 'Home', href: basePath });

  const navLabels = {
    filing: siteConfig?.nav_filing || 'File Your Candidacy',
    candidates: siteConfig?.nav_candidates || 'Meet the Candidates',
    appeal: siteConfig?.nav_appeal || 'Submit an Appeal',
    vote: siteConfig?.nav_vote || 'Cast Your Vote',
    results: siteConfig?.nav_results || 'Election Results',
  };

  if (!userContext) {
    // Unauthenticated (General Public)
    if (isPhaseReachable(phases, 'publication')) {
      nav.push({ label: navLabels.candidates, href: `${basePath}/candidates` });
    }
    if (isPhaseReachable(phases, 'results')) {
      nav.push({ label: navLabels.results, href: `${basePath}/results` });
    }
    return nav;
  }

  if (userContext.isVoter) {
    if (isPhaseReachable(phases, 'publication') && siteConfig?.voter_can_view_candidates !== false) {
      nav.push({ label: navLabels.candidates, href: `${basePath}/candidates` });
    }
    if (isPhaseActive(phases, 'voting')) {
      nav.push({ label: navLabels.vote, href: `${basePath}/vote`, highlight: true });
    }
    if (isPhaseReachable(phases, 'results')) {
      nav.push({ label: navLabels.results, href: `${basePath}/results` });
    }
  } else if (userContext.isCandidate) {
    // Candidates always have access to their filing
    nav.push({ label: 'My Filing', href: `${basePath}/file` });

    if (isPhaseReachable(phases, 'publication')) {
      nav.push({ label: navLabels.candidates, href: `${basePath}/candidates` });
    }
    if (isPhaseActive(phases, 'appeal')) {
      nav.push({ label: navLabels.appeal, href: `${basePath}/appeal` });
    }
    if (isPhaseReachable(phases, 'results') && siteConfig?.candidate_can_view_results !== false) {
      nav.push({ label: navLabels.results, href: `${basePath}/results` });
    }
  }

  return nav;
}
