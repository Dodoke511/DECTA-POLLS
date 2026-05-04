export type PublishMode = 'immediate' | 'manual' | 'scheduled';
export type ResultsVisibility = 'public' | 'voters' | 'organization';
export type DownloadFormat = 'pdf' | 'csv' | 'both';
export type DownloadVisibility = 'public' | 'admin';

export interface ResultsConfig {
  id?: string;
  election_id: string;
  tenant_id: string;

  // Publication
  publish_mode: PublishMode;
  results_visibility: ResultsVisibility;

  // Display (all tiers)
  show_vote_counts: boolean;
  show_winner_prominently: boolean;

  // Standard+ features
  show_turnout_stats: boolean;
  show_live_turnout: boolean;
  enable_results_download: boolean;
  download_format: DownloadFormat;
  download_visibility: DownloadVisibility;

  // Enterprise features
  enable_audit_export: boolean;

  created_at?: string;
  updated_at?: string;
}
