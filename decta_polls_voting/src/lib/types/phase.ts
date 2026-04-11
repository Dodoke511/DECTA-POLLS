// Phase Pipeline — closed enum and shared types

export type PhaseType =
  | 'filing'
  | 'screening'
  | 'appeal'
  | 'publication'
  | 'voting'
  | 'results';

export type TransitionMode = 'manual' | 'deadline';

export interface PhaseConfig {
  id?: string;
  electionID: string;
  phase_type: PhaseType;
  phase_index: number;
  is_enabled: boolean;
  name: string;
  deadline: string | null;
  role_assigned: string | null;
  transition_mode: TransitionMode;
}

export interface PhaseMetadata {
  type: PhaseType;
  index: number;
  defaultName: string;
  required: boolean;
  description: string;
  features: {
    enables: string[];
    disables: string[];
  };
  requiresPhase?: PhaseType;
  hasManagerRole: boolean;
  hasDeadline: boolean;
  hasTransitionMode: boolean;
  redirectToSettings: boolean;
  embedModule: boolean;
}

export const PHASE_PIPELINE: PhaseMetadata[] = [
  {
    type: 'filing',
    index: 1,
    defaultName: 'Filing',
    required: true,
    description: 'Candidates submit their application forms and required documents. Ballot and results access are locked.',
    features: {
      enables: ['Candidate Application Form', 'Document Upload'],
      disables: ['Ballot Access', 'Results Access'],
    },
    hasManagerRole: false,
    hasDeadline: true,
    hasTransitionMode: true,
    redirectToSettings: false,
    embedModule: false,
  },
  {
    type: 'screening',
    index: 2,
    defaultName: 'Screening',
    required: false,
    description: 'A review panel evaluates and approves or rejects candidate applications.',
    features: {
      enables: ['Candidate Review Panel', 'Approval Controls'],
      disables: ['Candidate Application Form', 'Ballot Access'],
    },
    hasManagerRole: true,
    hasDeadline: true,
    hasTransitionMode: true,
    redirectToSettings: false,
    embedModule: false,
  },
  {
    type: 'appeal',
    index: 3,
    defaultName: 'Appeal',
    required: false,
    description: 'Rejected candidates may submit formal appeals against screening decisions. Requires Screening to be enabled.',
    features: {
      enables: ['Appeal Submission Form', 'Appeal Review Panel'],
      disables: ['Candidate Application Form', 'Ballot Access'],
    },
    requiresPhase: 'screening',
    hasManagerRole: true,
    hasDeadline: true,
    hasTransitionMode: true,
    redirectToSettings: false,
    embedModule: false,
  },
  {
    type: 'publication',
    index: 4,
    defaultName: 'Publication',
    required: false,
    description: 'Approved candidate profiles are published for public viewing. Configure listing layout and visible fields.',
    features: {
      enables: ['Candidate Listing (Public)', 'Candidate Profile Designer'],
      disables: ['Candidate Application Form', 'Ballot Access'],
    },
    hasManagerRole: false,
    hasDeadline: true,
    hasTransitionMode: true,
    redirectToSettings: false,
    embedModule: false,
  },
  {
    type: 'voting',
    index: 5,
    defaultName: 'Voting',
    required: true,
    description: 'The ballot opens and registered voters cast their votes. Applications and appeals are locked.',
    features: {
      enables: ['Voting Settings & Ballot Configuration'],
      disables: ['Candidate Application Form', 'Appeal Submission Form'],
    },
    hasManagerRole: false,
    hasDeadline: false,
    hasTransitionMode: false,
    redirectToSettings: true,
    embedModule: false,
  },
  {
    type: 'results',
    index: 6,
    defaultName: 'Results',
    required: true,
    description: 'Election results are tallied, published, and available for download. Ballot access is closed.',
    features: {
      enables: ['Results Access', 'Results Download'],
      disables: ['Ballot Access'],
    },
    hasManagerRole: false,
    hasDeadline: false,
    hasTransitionMode: false,
    redirectToSettings: true,
    embedModule: false,
  },
];

export const REQUIRED_PHASES: PhaseType[] = ['filing', 'voting', 'results'];
export const OPTIONAL_PHASES: PhaseType[] = ['screening', 'appeal', 'publication'];
