import { Match, TeamStats } from '@/types/cricket';

export const calculateTeamStats = (matches: Match[]): TeamStats => {
  const totalMatches = matches.length;
  const wins = matches.filter(m => m.result === 'Won').length;
  const losses = matches.filter(m => m.result === 'Lost').length;
  const noResults = matches.filter(m => m.result === 'No Result').length;
  
  const winPercentage = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  
  const validMatches = matches.filter(m => m.nepal_runs > 0);
  const avgRunsScored = validMatches.length > 0
    ? validMatches.reduce((sum, m) => sum + m.nepal_runs, 0) / validMatches.length
    : 0;
  
  const matchesWithWickets = matches.filter(m => m.nepal_wickets_lost > 0);
  const avgWicketsTaken = matchesWithWickets.length > 0
    ? matchesWithWickets.reduce((sum, m) => sum + m.nepal_wickets_lost, 0) / matchesWithWickets.length
    : 0;
  
  // Estimate run rate (simplified)
  const runRate = avgRunsScored / (matches[0]?.format === 'T20I' ? 20 : 50);
  
  return {
    totalMatches,
    wins,
    losses,
    noResults,
    winPercentage,
    avgRunsScored,
    avgWicketsTaken,
    runRate,
  };
};
