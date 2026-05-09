export type Format = 'T20I' | 'ODI' | 'Both';

export interface Match {
  format: string;
  date: string;
  opponent: string;
  venue: string;
  result: string;
  nepal_runs: number;
  nepal_wickets_lost: number;
  opponent_runs?: number;
  opponent_wickets_lost?: number;
}

export interface Player {
  Player: string;
  Matches: number;
  Innings: number;
  'Not Outs'?: number;
  Runs?: number;
  'Highest Score'?: string;
  Average: number;
  'Strike Rate': number;
  'Balls Faced'?: number;
  '100s'?: number;
  '50s'?: number;
  Fours?: number;
  Sixes?: number;
  'T20I Matches': number;
  'T20I Runs'?: number;
  'T20I Wickets'?: number;
  'ODI Matches': number;
  'ODI Runs'?: number;
  'ODI Wickets'?: number;
  Balls?: number;
  Wickets?: number;
  'Best Bowling'?: string;
  Economy?: number;
  Maidens?: number;
  '4W'?: number;
  '5W'?: number;
}

export interface TeamStats {
  totalMatches: number;
  wins: number;
  losses: number;
  noResults: number;
  winPercentage: number;
  avgRunsScored: number;
  avgWicketsTaken: number;
  runRate: number;
}

export interface PlayingXI {
  batsmen: Player[];
  bowlers: Player[];
  allRounders: Player[];
  keeper: Player | null;
}
