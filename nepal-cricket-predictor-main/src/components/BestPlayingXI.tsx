import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Format, Player } from '@/types/cricket';
import { loadBatsmen, loadBowlers } from '@/utils/csvParser';
import { Users, Star, Shield, Search, GripVertical, X, Check, TrendingUp, Target } from 'lucide-react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface BestPlayingXIProps {
  format: Format;
}

// ===== ENHANCED FAIR RATING SYSTEM =====
// Normalized 0-100 scoring for each stat type

// Batsmen benchmarks (adjusted for Nepal context)
const BATSMEN_BENCHMARKS = {
  runs: { max: 3500 },         // Slightly lower to boost top performers
  average: { max: 35 },        // Top is ~34
  strikeRate: { max: 120 },    // Top is ~146, lower benchmark = higher scores
  hundreds: { max: 4 },
  fifties: { max: 20 },
};

// Bowler benchmarks (adjusted for better scoring)
const BOWLER_BENCHMARKS = {
  wickets: { max: 250 },       // Lower = higher scores for good bowlers
  economy: { best: 3.5, worst: 9.0 },  // Adjusted range
  bowlingAvg: { best: 16, worst: 45 },
  fourWickets: { max: 12 },
  fiveWickets: { max: 7 },
};

// Calculate normalized score (0-100) for a stat - with boost for exceeding max
const normalize = (value: number, max: number) => {
  const score = (value / max) * 100;
  // Allow scores above 100 for exceptional performance, cap at 120
  return Math.min(120, score);
};

// Inverse normalize for stats where lower is better
const inverseNormalize = (value: number, best: number, worst: number) => {
  if (!value || value <= 0) return 50; // Default for missing data
  if (value <= best) return 100;
  if (value >= worst) return 10; // Floor at 10, not 0
  return ((worst - value) / (worst - best)) * 90 + 10;
};

// Calculate fair player rating (5.0-9.9 scale for better distinction)
const calculatePlayerRating = (player: Player): number => {
  const scores: number[] = [];

  // Batting component
  if (player.Runs && player.Runs > 0) {
    const runScore = normalize(player.Runs, BATSMEN_BENCHMARKS.runs.max);
    const avgScore = normalize(player.Average || 0, BATSMEN_BENCHMARKS.average.max);
    const srScore = normalize(player['Strike Rate'] || 0, BATSMEN_BENCHMARKS.strikeRate.max);
    const hundredScore = normalize(player['100s'] || 0, BATSMEN_BENCHMARKS.hundreds.max);
    const fiftyScore = normalize(player['50s'] || 0, BATSMEN_BENCHMARKS.fifties.max);

    // Weighted batting score with emphasis on avg and runs
    const battingScore = (runScore * 0.35) + (avgScore * 0.30) + (srScore * 0.20) + (hundredScore * 0.1) + (fiftyScore * 0.05);
    scores.push(Math.min(100, battingScore));
  }

  // Bowling component
  if (player.Wickets && player.Wickets > 0) {
    const wicketScore = normalize(player.Wickets, BOWLER_BENCHMARKS.wickets.max);
    const economyScore = inverseNormalize(player.Economy || 6, BOWLER_BENCHMARKS.economy.best, BOWLER_BENCHMARKS.economy.worst);
    const fourWScore = normalize(player['4W'] || 0, BOWLER_BENCHMARKS.fourWickets.max);
    const fiveWScore = normalize(player['5W'] || 0, BOWLER_BENCHMARKS.fiveWickets.max);

    // Weighted bowling score with emphasis on wickets and economy
    const bowlingScore = (wicketScore * 0.45) + (economyScore * 0.35) + (fourWScore * 0.12) + (fiveWScore * 0.08);
    scores.push(Math.min(100, bowlingScore));
  }

  if (scores.length === 0) return 5.0;

  // For all-rounders, take the higher of the two scores (not average)
  // This rewards players who excel in one discipline
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Use weighted combination: 60% max score + 40% average (rewards excellence)
  const finalScore = (maxScore * 0.6) + (avgScore * 0.4);

  // Scale to 5.0-9.9 range (higher floor, better spread)
  return Math.min(9.9, Math.max(5.0, 5.0 + (finalScore / 100) * 4.9));
};

// Get player role based on stat dominance
const getPlayerRole = (player: Player): 'Batsman' | 'Bowler' | 'All-Rounder' | 'WK' => {
  // Special case for keeper
  if (player.Player.includes('Aasif Sheikh')) return 'WK';

  const runs = player.Runs || 0;
  const wickets = player.Wickets || 0;

  // Normalize stats to comparable scale
  // Top batsman has ~4000 runs, top bowler has ~300 wickets
  // So 1 wicket ≈ 13 runs in contribution
  const battingStrength = runs / 4000 * 100;  // 0-100 scale
  const bowlingStrength = wickets / 300 * 100; // 0-100 scale

  // Determine dominance
  const totalStrength = battingStrength + bowlingStrength;
  if (totalStrength === 0) return 'Batsman';

  const battingRatio = battingStrength / totalStrength;
  const bowlingRatio = bowlingStrength / totalStrength;

  // If bowling is dominant (>60% of strength), they're a bowler
  if (bowlingRatio > 0.60 && wickets > 30) return 'Bowler';

  // If batting is dominant (>70% of strength), they're a batsman
  if (battingRatio > 0.70 && runs > 500) return 'Batsman';

  // If both are significant and balanced, they're all-rounder
  if (runs > 300 && wickets > 20) return 'All-Rounder';

  // Default based on which is higher
  if (bowlingStrength > battingStrength && wickets > 10) return 'Bowler';
  return 'Batsman';
};

// ===== COMPONENTS =====

const SquadPlayer = ({ player, isSelected }: { player: Player; isSelected: boolean }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: player.Player,
    data: { player },
    disabled: isSelected,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const rating = calculatePlayerRating(player);
  const role = getPlayerRole(player);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border flex items-center gap-3 bg-card ${isSelected
        ? 'opacity-50 cursor-not-allowed border-dashed'
        : 'hover:border-primary cursor-grab active:cursor-grabbing shadow-sm'
        }`}
    >
      <div className="bg-muted p-1.5 rounded text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{player.Player}</div>
        <div className="text-xs text-muted-foreground flex gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${role === 'Bowler' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
            role === 'All-Rounder' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>{role}</span>
          <span>★ {rating.toFixed(1)}</span>
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 text-green-500" />}
    </div>
  );
};

const XISlot = ({ index, player, onRemove }: { index: number; player?: Player; onRemove: (p: Player) => void }) => {
  const { setNodeRef } = useDroppable({
    id: `xi-slot-${index}`,
  });

  const rating = player ? calculatePlayerRating(player) : 0;
  const role = player ? getPlayerRole(player) : '';

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-xl p-3 h-[80px] flex items-center gap-3 transition-all ${player ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-dashed border-muted-foreground/30'
        }`}
    >
      <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center border font-bold text-muted-foreground text-sm shadow-sm">
        {index + 1}
      </div>

      {player ? (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{player.Player}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${role === 'Bowler' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                role === 'All-Rounder' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>{role}</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">★ {rating.toFixed(1)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(player)}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <div className="text-sm text-muted-foreground italic">Drag a player here</div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====

const BestPlayingXI = ({ format }: BestPlayingXIProps) => {
  const [batsmen, setBatsmen] = useState<Player[]>([]);
  const [bowlers, setBowlers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  const [selectedXI, setSelectedXI] = useState<Player[]>([]);
  const [manualXI, setManualXI] = useState<Player[]>([]);

  const [manualFormat, setManualFormat] = useState<'T20I' | 'ODI'>('T20I');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [batsmenData, bowlersData] = await Promise.all([loadBatsmen('Both'), loadBowlers('Both')]);

        setBatsmen(batsmenData || []);
        setBowlers(bowlersData || []);

        // Merge players, combining stats where applicable
        const playerMap = new Map<string, Player>();

        // Add batsmen first
        (batsmenData || []).forEach((p) => {
          if (p && p.Player) {
            playerMap.set(p.Player, { ...p });
          }
        });

        // Merge bowlers (add bowling stats to existing batsmen or add new)
        (bowlersData || []).forEach((p) => {
          if (p && p.Player) {
            const existing = playerMap.get(p.Player);
            if (existing) {
              // Merge bowling stats into batsman
              playerMap.set(p.Player, {
                ...existing,
                Wickets: p.Wickets,
                Economy: p.Economy,
                '4W': p['4W'],
                '5W': p['5W'],
                'Best Bowling': p['Best Bowling'],
                'T20I Wickets': p['T20I Wickets'],
                'ODI Wickets': p['ODI Wickets'],
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
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate team rating as average of player ratings
  const calculateTeamRating = (team: Player[]) => {
    if (!team || team.length === 0) return '0.0';
    const avgRating = team.reduce((sum, p) => sum + calculatePlayerRating(p), 0) / team.length;
    return avgRating.toFixed(1);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setActivePlayer(event.active.data.current?.player);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActivePlayer(null);

    if (over && (over.id === 'xi-container' || (over.id as string).startsWith('xi-slot'))) {
      const player = active.data.current?.player;
      if (player && !manualXI.find((p) => p.Player === player.Player) && manualXI.length < 11) {
        setManualXI([...manualXI, player]);
      }
    }
  };

  const removeFromManualXI = (player: Player) => {
    setManualXI(manualXI.filter((p) => p.Player !== player.Player));
  };

  // Auto XI generation - maximize team rating while maintaining balance
  const generateAutoXI = (selectedFormat: 'T20I' | 'ODI') => {
    try {
      // Score all players fairly
      const scoredPlayers = allPlayers.map(p => ({
        ...p,
        rating: calculatePlayerRating(p),
        role: getPlayerRole(p),
      })).sort((a, b) => b.rating - a.rating);

      // Priority: Take highest rated players while ensuring team balance
      // Minimum requirements: 1 WK, 3 Batsmen, 1 All-Rounder, 3 Bowlers
      const xi: Player[] = [];
      const usedPlayers = new Set<string>();

      const addPlayer = (p: Player) => {
        if (!usedPlayers.has(p.Player)) {
          xi.push(p);
          usedPlayers.add(p.Player);
        }
      };

      // 1. Keeper first (Aasif Sheikh)
      const keeper = scoredPlayers.find(p => p.role === 'WK');
      if (keeper) addPlayer(keeper);

      // 2. Top 3 bowlers (crucial for team)
      scoredPlayers
        .filter(p => p.role === 'Bowler' && !usedPlayers.has(p.Player))
        .slice(0, 3)
        .forEach(addPlayer);

      // 3. Top 2 all-rounders
      scoredPlayers
        .filter(p => p.role === 'All-Rounder' && !usedPlayers.has(p.Player))
        .slice(0, 2)
        .forEach(addPlayer);

      // 4. Top 3 batsmen
      scoredPlayers
        .filter(p => p.role === 'Batsman' && !usedPlayers.has(p.Player))
        .slice(0, 3)
        .forEach(addPlayer);

      // 5. Fill remaining slots with highest rated players (any role)
      scoredPlayers
        .filter(p => !usedPlayers.has(p.Player))
        .slice(0, 11 - xi.length)
        .forEach(addPlayer);

      setSelectedXI(xi.slice(0, 11));
    } catch (error) {
      console.error('Auto XI generation error:', error);
    }
  };

  const filteredSquad = allPlayers.filter((p) => p.Player.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading Squad Data...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto">Auto Suggested XI</TabsTrigger>
          <TabsTrigger value="manual">Manual XI Builder</TabsTrigger>
        </TabsList>

        {/* AUTO TAB */}
        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                AI-Generated Best Playing XI
              </CardTitle>
              <CardDescription>Balanced selection based on {manualFormat} stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={manualFormat} onValueChange={(v) => setManualFormat(v as 'T20I' | 'ODI')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T20I">T20I Format</SelectItem>
                    <SelectItem value="ODI">ODI Format</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => generateAutoXI(manualFormat)}>
                  <Users className="h-4 w-4 mr-2" /> Generate Best XI
                </Button>
              </div>

              {selectedXI.length > 0 && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                    <span className="font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" /> Team Rating
                    </span>
                    <span className="text-2xl font-bold text-primary">{calculateTeamRating(selectedXI)}/10</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedXI.map((p, i) => {
                      const rating = calculatePlayerRating(p);
                      const role = getPlayerRole(p);
                      // Custom role handling for Aasif Sheikh is done in getPlayerRole now ('WK')

                      return (
                        <div key={i} className="p-3 border rounded-lg bg-card">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">{p.Player}</div>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${role === 'Bowler' ? 'font-bold border-blue-500 text-blue-600' :
                                  role === 'All-Rounder' ? 'font-bold border-purple-500 text-purple-600' :
                                    role === 'WK' ? 'font-bold border-red-500 text-red-600' :
                                      'font-bold border-green-500 text-green-600'
                                  }`}>{role}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-amber-600">★ {rating.toFixed(1)}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {role !== 'Bowler' && (
                              <>
                                <div className="flex justify-between">
                                  <span>Runs:</span>
                                  <span className="font-medium text-foreground">{p.Runs || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg:</span>
                                  <span className="font-medium text-foreground">{p.Average?.toFixed(1) || '0'}</span>
                                </div>
                              </>
                            )}
                            {(role === 'Bowler' || role === 'All-Rounder') && (
                              <>
                                <div className="flex justify-between">
                                  <span>Wickets:</span>
                                  <span className="font-medium text-foreground">{p.Wickets || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Econ:</span>
                                  <span className="font-medium text-foreground">{p.Economy?.toFixed(2) || '-'}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANUAL TAB */}
        <TabsContent value="manual" className="h-[800px]">
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* SQUAD LIST */}
              <Card className="lg:col-span-1 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Squad Selection</CardTitle>
                  <CardDescription>Drag players to your XI</CardDescription>
                  <div className="pt-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search player..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px] px-4 pb-4">
                    <div className="space-y-2 pt-2">
                      {filteredSquad.map((player) => (
                        <SquadPlayer
                          key={player.Player}
                          player={player}
                          isSelected={!!manualXI.find((p) => p.Player === player.Player)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* PLAYING XI */}
              <ManualXIDropZone
                manualXI={manualXI}
                calculateTeamRating={calculateTeamRating}
                removeFromManualXI={removeFromManualXI}
              />
            </div>

            <DragOverlay>
              {activeId && activePlayer ? (
                <div className="p-3 rounded-lg border bg-card shadow-xl w-[250px] opacity-90 cursor-grabbing bg-white dark:bg-slate-900 border-primary">
                  <div className="font-bold">{activePlayer.Player}</div>
                  <div className="text-xs text-muted-foreground">★ {calculatePlayerRating(activePlayer).toFixed(1)}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Drop zone component
const ManualXIDropZone = ({ manualXI, calculateTeamRating, removeFromManualXI }: any) => {
  const { setNodeRef } = useDroppable({
    id: 'xi-container',
  });

  const teamRating = calculateTeamRating(manualXI);

  return (
    <Card className="lg:col-span-2 h-full flex flex-col border-primary/20 shadow-lg">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Playing XI</CardTitle>
            <CardDescription>{manualXI.length} / 11 Players Selected</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Team Rating</div>
            <div
              className={`text-3xl font-bold ${Number(teamRating) > 7.5 ? 'text-green-600' :
                Number(teamRating) > 6.0 ? 'text-amber-600' : 'text-primary'
                }`}
            >
              {teamRating} <span className="text-lg text-muted-foreground">/ 10</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 bg-muted/10 p-4 overflow-auto">
        <div ref={setNodeRef} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 11 }).map((_, index) => (
            <XISlot key={index} index={index} player={manualXI[index]} onRemove={removeFromManualXI} />
          ))}
        </div>

        {manualXI.length === 11 && (
          <div className="mt-6 flex justify-center animate-in zoom-in duration-300">
            <Badge className="text-lg px-6 py-2 bg-green-600 hover:bg-green-700 shadow-md">Squad Complete!</Badge>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BestPlayingXI;
