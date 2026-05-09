import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Format } from '@/types/cricket';
import DataOverview from '@/components/DataOverview';
import MLPredictions from '@/components/MLPredictions';
import OppositionAnalysis from '@/components/OppositionAnalysis';
import BestPlayingXI from '@/components/BestPlayingXI';
import PlayerComparison from '@/components/PlayerComparison';
import { LayoutDashboard, Brain, Trophy, Users, BarChart2 } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Dashboard = () => {
  const [selectedFormat, setSelectedFormat] = useState<Format>('Both');
  const [activeTab, setActiveTab] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Data Overview', icon: LayoutDashboard },
    { id: 'predictions', label: 'ML Predictions', icon: Brain },
    { id: 'opposition', label: 'Opposition Analysis', icon: Users },
    { id: 'playingxi', label: 'Best Playing XI', icon: Trophy },
    { id: 'comparison', label: 'Player Comparison', icon: BarChart2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <DataOverview format={selectedFormat} />;
      case 'predictions': return <MLPredictions format={selectedFormat} />;
      case 'opposition': return <OppositionAnalysis format={selectedFormat} />;
      case 'playingxi': return <BestPlayingXI format={selectedFormat} />;
      case 'comparison': return <PlayerComparison format={selectedFormat} />;
      default: return <DataOverview format={selectedFormat} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Header */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 md:hidden" />
              <h1 className="text-xl font-bold text-gray-800">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border">
                <span className="text-sm font-medium text-gray-600">Format:</span>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as Format)}>
                  <SelectTrigger className="h-8 w-[120px] border-none bg-transparent shadow-none focus:ring-0 p-0 text-sm font-bold text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T20I">T20I</SelectItem>
                    <SelectItem value="ODI">ODI</SelectItem>
                    <SelectItem value="Both">All Formats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Main Content Area */}
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
