import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Format, Match, Player } from '@/types/cricket';
import { loadMatches, loadBatsmen, loadBowlers } from '@/utils/csvParser';
import { calculateTeamStats } from '@/utils/statsCalculator';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Trophy, Target, Activity } from 'lucide-react';

interface DataOverviewProps {
  format: Format;
}

const DataOverview = ({ format }: DataOverviewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [batsmen, setBatsmen] = useState<Player[]>([]);
  const [bowlers, setBowlers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [matchesData, batsmenData, bowlersData] = await Promise.all([
          loadMatches(format === 'Both' ? 'Both' : format),
          loadBatsmen(format === 'Both' ? 'Both' : format),
          loadBowlers(format === 'Both' ? 'Both' : format),
        ]);
        setMatches(matchesData);
        setBatsmen(batsmenData);
        setBowlers(bowlersData);
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

  const stats = calculateTeamStats(matches);
  const topBatsmen = batsmen.slice(0, 10);
  const topBowlers = bowlers.slice(0, 10);

  // Prepare chart data
  const last10Matches = matches.slice(-10);
  const recentWins = last10Matches.filter(m => m.result === 'Won').length;
  const recentLosses = last10Matches.filter(m => m.result === 'Lost').length;
  const recentTies = last10Matches.length - recentWins - recentLosses;

  const recentMatches = last10Matches.map((m, idx) => ({
    match: `M${idx + 1}`,
    runs: m.nepal_runs || 0,
    result: m.result === 'Won' ? 1 : 0,
    opponent: m.opponent?.substring(0, 10) || 'Unknown',
  }));

  const StatCard = ({ title, value, icon: Icon, subtitle }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Matches"
          value={stats.totalMatches}
          icon={Trophy}
          subtitle={`${format} format`}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winPercentage.toFixed(1)}%`}
          icon={TrendingUp}
          subtitle={`${stats.wins} wins, ${stats.losses} losses`}
        />
        <StatCard
          title="Avg Runs Scored"
          value={stats.avgRunsScored.toFixed(0)}
          icon={Target}
          subtitle="Per match"
        />
        <StatCard
          title="Recent Form"
          value={`${recentWins}W-${recentLosses}L`}
          icon={Activity}
          subtitle={`Last ${last10Matches.length} matches${recentTies > 0 ? `, ${recentTies} tie(s)` : ''}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Last 10 matches run trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentMatches}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="match" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="runs" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Run Scorers</CardTitle>
            <CardDescription>Runs distribution by top players</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBatsmen.slice(0, 5).map(b => ({
                name: b.Player.split(' ').pop(),
                runs: b.Runs || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="runs" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Batsmen</CardTitle>
            <CardDescription>Leading run scorers in {format} cricket</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">SR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBatsmen.map((player, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{player.Player}</TableCell>
                    <TableCell className="text-right">{player.Runs || 0}</TableCell>
                    <TableCell className="text-right">{player.Average.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{player['Strike Rate'].toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Bowlers</CardTitle>
            <CardDescription>Leading wicket takers in {format} cricket</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Wickets</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Econ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBowlers.map((player, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{player.Player}</TableCell>
                    <TableCell className="text-right">{player.Wickets || 0}</TableCell>
                    <TableCell className="text-right">{player.Average.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{player.Economy?.toFixed(2) || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataOverview;
