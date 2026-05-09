import { loadMatches } from './csvParser';

export const getUniqueOpponents = async (): Promise<string[]> => {
    const matches = await loadMatches('Both');
    const teams = new Set<string>();

    matches.forEach(match => {
        // Using Type Assertion as CSV structure might differ from strict Interface
        // but 'opponent' and 'venue' seem to be the intended keys based on cricket.ts
        if (match.opponent) teams.add(match.opponent);
        // Fallback for potential CSV header variations if dynamic typing is used
        if ((match as any).Opposition) teams.add((match as any).Opposition);
        if ((match as any).Team2) teams.add((match as any).Team2);
    });

    return Array.from(teams).sort();
};

export const getUniqueVenues = async (): Promise<string[]> => {
    const matches = await loadMatches('Both');
    const venues = new Set<string>();

    matches.forEach(match => {
        if (match.venue) venues.add(match.venue);
        if ((match as any).Ground) venues.add((match as any).Ground);
    });

    return Array.from(venues).sort();
};

export const getOpponentsWithStats = async (): Promise<string[]> => {
    const matches = await loadMatches('Both');
    const teamCounts = new Map<string, number>();

    matches.forEach(match => {
        let team = match.opponent || (match as any).Opposition || (match as any).Team2;
        if (team) {
            teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
        }
    });

    // Filter teams with more than 3 matches
    const frequentOpponents = Array.from(teamCounts.entries())
        .filter(([_, count]) => count > 3)
        .map(([team]) => team);

    return frequentOpponents.sort();
};
