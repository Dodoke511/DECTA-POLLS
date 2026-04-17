export type VotingMethod = 'standard' | 'ranked';
export type BallotLayout = 'single_page' | 'step_by_step';

export interface VotingConfig {
  id?: string;
  election_id: string;
  tenant_id: string;
  
  // Schedule
  voting_start: string;
  voting_end: string;

  // Ballot settings
  voting_method: VotingMethod;
  abstain_allowed: boolean;

  // Ballot appearance
  ballot_layout: BallotLayout;
  show_candidate_photos: boolean;
  show_position_desc: boolean;
  show_candidate_listing_link: boolean;

  created_at?: string;
  updated_at?: string;
}
