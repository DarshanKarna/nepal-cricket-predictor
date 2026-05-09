import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Format, Match } from '@/types/cricket';
import { loadMatches } from '@/utils/csvParser';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface OppositionAnalysisProps {
  format: Format;
}

const OppositionAnalysis = ({ format }: OppositionAnalysisProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const matchesData = await loadMatches(format === 'Both' ? 'Both' : format);
        setMatches(matchesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [format]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  // Analyze opponents
  const opponentStats: Record<string, { played: number; won: number; lost: number; nr: number; runs: number }> = {};
  
  matches.forEach(match => {
    if (!opponentStats[match.opponent]) {
      opponentStats[match.opponent] = { played: 0, won: 0, lost: 0, nr: 0, runs: 0 };
    }
    opponentStats[match.opponent].played++;
    opponentStats[match.opponent].runs += match.nepal_runs;
    if (match.result === 'Won') opponentStats[match.opponent].won++;
    else if (match.result === 'Lost') opponentStats[match.opponent].lost++;
    else opponentStats[match.opponent].nr++;
  });

  const opponentData = Object.entries(opponentStats)
    .map(([opponent, stats]) => ({
      opponent,
      ...stats,
      winRate: stats.played > 0 ? (stats.won / stats.played) * 100 : 0,
      avgRuns: stats.played > 0 ? stats.runs / stats.played : 0,
    }))
    .sort((a, b) => b.played - a.played)
    .slice(0, 10);

  // Result distribution
  const resultData = [
    { name: 'Won', value: matches.filter(m => m.result === 'Won').length, color: 'hsl(var(--chart-1))' },
    { name: 'Lost', value: matches.filter(m => m.result === 'Lost').length, color: 'hsl(var(--destructive))' },
    { name: 'No Result', value: matches.filter(m => m.result === 'No Result').length, color: 'hsl(var(--muted))' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Head-to-Head Records</CardTitle>
            <CardDescription>Performance against top opponents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opponentData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="opponent" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" fill="hsl(var(--primary))" name="Won" />
                <Bar dataKey="lost" fill="hsl(var(--destructive))" name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Result Distribution</CardTitle>
            <CardDescription>Win/Loss/No Result breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resultData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Opposition Statistics</CardTitle>
          <CardDescription>Complete breakdown of performances against each opponent</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opponent</TableHead>
                <TableHead className="text-right">Played</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Avg Runs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opponentData.map((opp, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{opp.opponent}</TableCell>
                  <TableCell className="text-right">{opp.played}</TableCell>
                  <TableCell className="text-right text-primary font-semibold">{opp.won}</TableCell>
                  <TableCell className="text-right text-destructive">{opp.lost}</TableCell>
                  <TableCell className="text-right">{opp.winRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{opp.avgRuns.toFixed(0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OppositionAnalysis;
