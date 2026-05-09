import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Format, Player } from '@/types/cricket';
import { loadBatsmen, loadBowlers } from '@/utils/csvParser';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { GitCompare, Star } from 'lucide-react';

interface PlayerComparisonProps {
  format: Format;
}

// ENHANCED BENCHMARKS for normalization
const BENCHMARKS = {
  battingAvg: { max: 35 },
  strikeRate: { max: 120 },
  runs: { max: 3500 },
  wickets: { max: 250 },
  economy: { best: 3.5, worst: 9.0 },
  bowlingAvg: { best: 16, worst: 45 },
};

// Normalize to 0-100 scale with boost for excellence
const normalize = (value: number, max: number) => {
  const score = (value / max) * 100;
  return Math.min(120, score);
};

// Inverse normalize (for stats where lower is better)
const inverseNormalize = (value: number, best: number, worst: number) => {
  if (!value || value <= 0) return 50;
  if (value <= best) return 100;
  if (value >= worst) return 10;
  return ((worst - value) / (worst - best)) * 90 + 10;
};

// Get player role based on stat dominance ratio
const getPlayerRole = (player: Player): 'Batsman' | 'Bowler' | 'All-Rounder' | 'WK' => {
  if (player.Player.includes('Aasif Sheikh')) return 'WK';

  const runs = player.Runs || 0;
  const wickets = player.Wickets || 0;

  const battingStrength = runs / 3500 * 100;
  const bowlingStrength = wickets / 250 * 100;
  const totalStrength = battingStrength + bowlingStrength;

  if (totalStrength === 0) return 'Batsman';

  const bowlingRatio = bowlingStrength / totalStrength;
  const battingRatio = battingStrength / totalStrength;

  if (bowlingRatio > 0.60 && wickets > 30) return 'Bowler';
  if (battingRatio > 0.70 && runs > 500) return 'Batsman';
  if (runs > 300 && wickets > 20) return 'All-Rounder';
  if (bowlingStrength > battingStrength && wickets > 10) return 'Bowler';
  return 'Batsman';
};

// Calculate fair player rating (5.0-9.9 scale)
const calculatePlayerRating = (player: Player): number => {
  const scores: number[] = [];

  // Batting component
  if (player.Runs && player.Runs > 0) {
    const runScore = normalize(player.Runs, BENCHMARKS.runs.max);
    const avgScore = normalize(player.Average || 0, BENCHMARKS.battingAvg.max);
    const srScore = normalize(player['Strike Rate'] || 0, BENCHMARKS.strikeRate.max);
    const battingScore = (runScore * 0.4) + (avgScore * 0.35) + (srScore * 0.25);
    scores.push(Math.min(100, battingScore));
  }

  // Bowling component
  if (player.Wickets && player.Wickets > 0) {
    const wicketScore = normalize(player.Wickets, BENCHMARKS.wickets.max);
    const economyScore = inverseNormalize(player.Economy || 6, BENCHMARKS.economy.best, BENCHMARKS.economy.worst);
    const bowlingScore = (wicketScore * 0.5) + (economyScore * 0.5);
    scores.push(Math.min(100, bowlingScore));
  }

  if (scores.length === 0) return 5.0;

  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const finalScore = (maxScore * 0.6) + (avgScore * 0.4);

  return Math.min(9.9, Math.max(5.0, 5.0 + (finalScore / 100) * 4.9));
};

const PlayerComparison = ({ format }: PlayerComparisonProps) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [batsmenData, bowlersData] = await Promise.all([
          loadBatsmen('Both'),
          loadBowlers('Both'),
        ]);

        // Merge players with combined stats
        const playerMap = new Map<string, Player>();

        (batsmenData || []).forEach(p => {
          if (p && p.Player) playerMap.set(p.Player, { ...p });
        });

        (bowlersData || []).forEach(p => {
          if (p && p.Player) {
            const existing = playerMap.get(p.Player);
            if (existing) {
              playerMap.set(p.Player, {
                ...existing,
                Wickets: p.Wickets,
                Economy: p.Economy,
                '4W': p['4W'],
                '5W': p['5W'],
                'Best Bowling': p['Best Bowling'],
              });
            } else {
              playerMap.set(p.Player, { ...p });
            }
          }
        });

        // Sort by rating
        const players = Array.from(playerMap.values()).sort((a, b) =>
          calculatePlayerRating(b) - calculatePlayerRating(a)
        );
        setAllPlayers(players);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  const getPlayerData = (playerName: string) => {
    return allPlayers.find(p => p.Player === playerName);
  };

  const compareData = selectedPlayers.map(name => getPlayerData(name)).filter(Boolean) as Player[];

  // Improved radar data with proper normalization
  const prepareRadarData = () => {
    if (compareData.length === 0) return [];

    const metrics = [
      { key: 'Batting Avg', label: 'Batting Avg' },
      { key: 'Strike Rate', label: 'Strike Rate' },
      { key: 'Runs', label: 'Runs' },
      { key: 'Wickets', label: 'Wickets' },
      { key: 'Economy', label: 'Economy' },
    ];

    return metrics.map(({ key, label }) => {
      const data: any = { metric: label };

      compareData.forEach(player => {
        let value = 0;
        switch (key) {
          case 'Batting Avg':
            value = normalize(player.Average || 0, BENCHMARKS.battingAvg.max);
            break;
          case 'Strike Rate':
            value = normalize(player['Strike Rate'] || 0, BENCHMARKS.strikeRate.max);
            break;
          case 'Runs':
            value = normalize(player.Runs || 0, BENCHMARKS.runs.max);
            break;
          case 'Wickets':
            value = normalize(player.Wickets || 0, BENCHMARKS.wickets.max);
            break;
          case 'Economy':
            // Economy: lower is better, so inverse normalize
            value = inverseNormalize(player.Economy || 0, BENCHMARKS.economy.best, BENCHMARKS.economy.worst);
            break;
        }
        data[player.Player] = Math.round(value);
      });
      return data;
    });
  };

  // Prepare grouped bar data for side-by-side comparison (NORMALIZED)
  const prepareBarData = () => {
    const categories = [
      { key: 'Runs', label: 'Runs' },
      { key: 'Wickets', label: 'Wickets' },
      { key: 'Matches', label: 'Matches' },
      { key: 'Average', label: 'Average' },
      { key: 'Economy', label: 'Economy' },
    ];

    return categories.map(({ key, label }) => {
      const data: any = { category: label };
      compareData.forEach(player => {
        const shortName = player.Player.split(' ').pop() || player.Player;
        let normalizedValue = 0;
        switch (key) {
          case 'Runs':
            normalizedValue = normalize(player.Runs || 0, BENCHMARKS.runs.max);
            break;
          case 'Wickets':
            normalizedValue = normalize(player.Wickets || 0, BENCHMARKS.wickets.max);
            break;
          case 'Matches':
            normalizedValue = normalize(player.Matches || 0, 150); // Max benchmark for matches
            break;
          case 'Average':
            normalizedValue = normalize(player.Average || 0, BENCHMARKS.battingAvg.max);
            break;
          case 'Economy':
            // Economy: lower is better
            normalizedValue = inverseNormalize(player.Economy || 0, BENCHMARKS.economy.best, BENCHMARKS.economy.worst);
            break;
        }
        data[shortName] = Math.round(normalizedValue);
      });
      return data;
    });
  };

  // Chart colors (CAN theme)
  const COLORS = ['#E32227', '#1E3A8A', '#10B981'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Player Comparison Tool
          </CardTitle>
          <CardDescription>
            Compare up to 3 players across batting and bowling stats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-sm font-medium">Player {idx + 1}</label>
                <Select
                  value={selectedPlayers[idx] || ''}
                  onValueChange={(value) => {
                    const newSelected = [...selectedPlayers];
                    newSelected[idx] = value;
                    setSelectedPlayers(newSelected);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select player ${idx + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayers.map((player) => (
                      <SelectItem key={player.Player} value={player.Player}>
                        {player.Player}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {compareData.length >= 2 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>Multi-dimensional performance comparison (0-100 normalized)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={prepareRadarData()}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      tickCount={5}
                    />
                    {compareData.map((player, idx) => (
                      <Radar
                        key={player.Player}
                        name={player.Player}
                        dataKey={player.Player}
                        stroke={COLORS[idx]}
                        fill={COLORS[idx]}
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistical Comparison</CardTitle>
                <CardDescription>Normalized performance comparison (0-100 scale)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={prepareBarData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="category" width={80} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                    <Legend />
                    {compareData.map((player, idx) => {
                      const shortName = player.Player.split(' ').pop() || player.Player;
                      return (
                        <Bar
                          key={shortName}
                          dataKey={shortName}
                          fill={COLORS[idx]}
                          name={player.Player}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compareData.map((player, idx) => {
              const role = getPlayerRole(player);
              const rating = calculatePlayerRating(player);

              return (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="pb-3" style={{ borderTop: `4px solid ${COLORS[idx]}` }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{player.Player}</CardTitle>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className={
                            role === 'Bowler' ? 'border-blue-500 text-blue-600' :
                              role === 'All-Rounder' ? 'border-purple-500 text-purple-600' :
                                'border-green-500 text-green-600'
                          }>{role}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="h-4 w-4 fill-amber-500" />
                        <span className="text-lg font-bold">{rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        T20I: {player['T20I Matches'] || 0} mat
                      </Badge>
                      <Badge variant="secondary">
                        ODI: {player['ODI Matches'] || 0} mat
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Batting Stats */}
                      {(player.Runs || 0) > 0 && (
                        <>
                          <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mt-2">Batting</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Runs:</span>
                              <span className="font-semibold">{player.Runs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg:</span>
                              <span className="font-semibold">{player.Average?.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SR:</span>
                              <span className="font-semibold">{player['Strike Rate']?.toFixed(1)}</span>
                            </div>
                            {player['100s'] !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">100s/50s:</span>
                                <span className="font-semibold">{player['100s']}/{player['50s']}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Bowling Stats */}
                      {(player.Wickets || 0) > 0 && (
                        <>
                          <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mt-2">Bowling</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Wickets:</span>
                              <span className="font-semibold">{player.Wickets}</span>
                            </div>
                            {player.Economy && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Econ:</span>
                                <span className="font-semibold">{player.Economy.toFixed(2)}</span>
                              </div>
                            )}
                            {player['Best Bowling'] && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Best:</span>
                                <span className="font-semibold">{player['Best Bowling']}</span>
                              </div>
                            )}
                            {(player['4W'] || player['5W']) && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">4W/5W:</span>
                                <span className="font-semibold">{player['4W'] || 0}/{player['5W'] || 0}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerComparison;
