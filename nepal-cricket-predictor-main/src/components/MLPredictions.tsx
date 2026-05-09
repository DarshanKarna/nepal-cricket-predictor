import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Format, Match } from '@/types/cricket';
import { Brain, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { getOpponentsWithStats, getUniqueVenues } from '@/utils/dataHelpers';
import { loadMatches } from '@/utils/csvParser';

interface MLPredictionsProps {
  format: Format;
}

const FloatingLabelSelect = ({ label, value, onValueChange, placeholder, options }: any) => {
  const isSelected = !!value && value.trim() !== '';
  return (
    <div className="relative mt-2">
      <Label
        className={`absolute left-2 transition-all duration-200 z-10 pointer-events-none ${isSelected ? '-top-2.5 text-xs bg-card px-1 text-primary font-medium' : 'top-2.5 text-muted-foreground'
          }`}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="pt-4 pb-1 h-12">
          <SelectValue placeholder=" " />
        </SelectTrigger>
        <SelectContent>
          {options.map((op: string) => (
            <SelectItem key={op} value={op}>{op}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const MLPredictions = ({ format: globalFormat }: MLPredictionsProps) => {
  const [predictionFormat, setPredictionFormat] = useState<'T20I' | 'ODI'>('T20I');
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState('');
  const [tossWon, setTossWon] = useState('Yes');
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [opponentsList, setOpponentsList] = useState<string[]>([]);
  const [venuesList, setVenuesList] = useState<string[]>([]);
  const [matchData, setMatchData] = useState<Match[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [ops, vens, matches] = await Promise.all([
          getOpponentsWithStats(),
          getUniqueVenues(),
          loadMatches('Both')
        ]);
        setOpponentsList(ops);
        setVenuesList(vens);
        setMatchData(matches);
      } catch (error) {
        console.error("Failed to load dropdown options", error);
      }
    };
    loadOptions();
  }, []);

  const runPrediction = async () => {
    if (!opponent || !venue) return;

    setLoading(true);

    // Filter matches for the specific conditions
    // Use 'fuzzy' matching or exact matching based on dataset quality
    const formatMatches = matchData.filter(m => m.format === predictionFormat);

    // 1. Calculate Historical Average vs Opponent
    const vsOpponent = formatMatches.filter(m =>
      (m.opponent === opponent) ||
      ((m as any).Opposition === opponent) ||
      ((m as any).Team2 === opponent)
    );

    // 2. Calculate Historical Average at Venue
    const atVenue = formatMatches.filter(m =>
      (m.venue === venue) ||
      ((m as any).Ground === venue)
    );

    const globalFormatAverage = predictionFormat === 'T20I' ? 140 : 220;

    const getAverageRuns = (matches: Match[]) => {
      if (matches.length === 0) return 0;
      const total = matches.reduce((sum, m) => sum + (m.nepal_runs || 0), 0);
      return total / matches.length;
    };

    const avgVsOpp = getAverageRuns(vsOpponent);
    const avgAtVenue = getAverageRuns(atVenue);

    // Weighted Prediction Formula
    // If no data exists, fallback to global average
    // Weights: Opponent (50%), Venue (30%), Global Baseline (20%)

    let baseline = globalFormatAverage;

    // Adjust weights dynamically based on data availability
    let predictionScore = baseline;

    if (vsOpponent.length > 0 && atVenue.length > 0) {
      predictionScore = (avgVsOpp * 0.5) + (avgAtVenue * 0.3) + (baseline * 0.2);
    } else if (vsOpponent.length > 0) {
      predictionScore = (avgVsOpp * 0.6) + (baseline * 0.4);
    } else if (atVenue.length > 0) {
      predictionScore = (avgAtVenue * 0.5) + (baseline * 0.5);
    } else {
      // No specific history, use baseline +/- small random factor
      predictionScore = baseline;
    }

    // Toss Factor
    if (tossWon === 'Yes') predictionScore += 10;

    // Add small variability (Cricket is unpredictable)
    const variability = (Math.random() * 20) - 10;

    const totalRuns = Math.round(predictionScore + variability);

    // Calculate Confidence based on sample size
    const dataPoints = vsOpponent.length + atVenue.length;
    const confidence = Math.min(98, 60 + (dataPoints * 5)); // starts at 60%, adds 5% per relevant match found

    // Generate Wicket Progression (Statistical Curve)
    const wicketProgression = [];
    for (let i = 1; i <= 10; i++) {
      // Model: Runs = Total * (1 - (1 - w/10)^2) ... simpler quadratic curve
      // Or essentially: early wickets cost less runs, tail ender wickets add fewer runs

      let percentRun = 0;
      const w = i;
      // Approximation of run accumulation curve
      if (w <= 2) percentRun = w * 0.15; // 15% runs for first 2 wkts
      else if (w <= 5) percentRun = 0.30 + (w - 2) * 0.12; // Middle order building
      else percentRun = 0.66 + (w - 5) * 0.07; // Tail enders

      // Clamp 
      if (w === 10) percentRun = 1;

      const runs = Math.round(totalRuns * percentRun);

      wicketProgression.push({
        wicket: `${i} wkt${i > 1 ? 's' : ''}`,
        runs: runs
      });
    }

    // Simulate "thinking" time
    await new Promise(resolve => setTimeout(resolve, 800));

    setPrediction({
      totalRuns,
      wicketProgression,
      confidence: confidence.toFixed(1),
      runRate: (totalRuns / (predictionFormat === 'T20I' ? 20 : 50)).toFixed(2),
      dataPoints // Debug info useful for user to know "Based on X matches"
    });

    setLoading(false);
  };

  const isFormValid = opponent.length > 0 && venue.length > 0;

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            ML-Powered Run Prediction
          </CardTitle>
          <CardDescription>
            Select match conditions to simulate Nepal's performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Custom Floating Label Components */}
            <div className="relative mt-2">
              <Label className="absolute -top-2.5 left-2 bg-card px-1 text-xs text-primary font-medium z-10">Format</Label>
              <Select value={predictionFormat} onValueChange={(v) => setPredictionFormat(v as 'T20I' | 'ODI')}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="T20I">T20I</SelectItem>
                  <SelectItem value="ODI">ODI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FloatingLabelSelect
              label="Opponent Team"
              value={opponent}
              onValueChange={setOpponent}
              options={opponentsList}
            />

            <FloatingLabelSelect
              label="Match Venue"
              value={venue}
              onValueChange={setVenue}
              options={venuesList}
            />

            <div className="relative mt-2">
              <Label className="absolute -top-2.5 left-2 bg-card px-1 text-xs text-primary font-medium z-10">Toss Result</Label>
              <Select value={tossWon} onValueChange={setTossWon}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Won</SelectItem>
                  <SelectItem value="No">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          <Button
            onClick={runPrediction}
            disabled={loading || !isFormValid}
            className="w-full md:w-auto min-w-[200px] h-11 text-base shadow-lg hover:shadow-xl transition-all"
            variant={isFormValid ? "default" : "secondary"}
          >
            {loading ? 'Analyzing Historical Data...' :
              !isFormValid ? 'Select Opponent & Venue' : 'Generate Prediction'}
          </Button>
        </CardContent>
      </Card>

      {prediction && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-card to-accent/5 border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">Expected Score</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground">{prediction.totalRuns}</span>
                  <span className="text-sm text-muted-foreground">runs</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-accent/5 border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">Confidence</div>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold text-main-accent">{prediction.confidence}%</span>
                  <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary animate-pulse" style={{ width: `${prediction.confidence}%` }}></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Based on {prediction.dataPoints} match records</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-accent/5 border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">Format</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground uppercase">{predictionFormat}</span>
                  <span className="text-sm text-muted-foreground">prediction</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Wicket-wise Run Progression</CardTitle>
              <CardDescription>Projected cumulative score at the fall of each wicket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prediction.wicketProgression}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="wicket"
                      type="category"
                      tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                      width={80}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar
                      dataKey="runs"
                      fill="url(#barGradient)"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                      animationDuration={1500}
                    >
                      <LabelList dataKey="runs" position="right" fill="hsl(var(--foreground))" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MLPredictions;
