import { useRef } from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, Brain, Trophy, Users, BarChart2, ExternalLink } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardSidebarProps {
    activeTab: string;
    onTabChange: (id: string) => void;
}

const DashboardSidebar = ({ activeTab, onTabChange }: DashboardSidebarProps) => {
    const isMobile = useIsMobile();
    const { setOpenMobile } = useSidebar();

    const menuItems = [
        { id: 'overview', label: 'Data Overview', icon: LayoutDashboard },
        { id: 'predictions', label: 'ML Predictions', icon: Brain },
        { id: 'opposition', label: 'Opposition Analysis', icon: Users },
        { id: 'playingxi', label: 'Best Playing XI', icon: Trophy },
        { id: 'comparison', label: 'Player Comparison', icon: BarChart2 },
    ];

    const handleItemClick = (id: string) => {
        onTabChange(id);
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Sidebar className="border-r">
            <SidebarHeader className="p-4 border-b">
                <div className="flex items-center gap-3">
                    <img src={`${import.meta.env.BASE_URL}can-logo.png`} alt="CAN Logo" className="h-8 w-auto object-contain" />
                    <span className="font-bold text-lg text-primary">Nepal Cricket</span>
                </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                                onClick={() => handleItemClick(item.id)}
                                isActive={activeTab === item.id}
                                className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 hover:text-accent data-[active=true]:bg-primary data-[active=true]:text-white rounded-lg"
                            >
                                <item.icon size={18} />
                                {item.label}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t flex flex-col gap-4">
                <div className="text-xs text-center text-gray-500 font-medium">
                    Designed and created by <span className="text-primary">Aadarsh Pandit</span>
                </div>
                <button
                    onClick={() => window.open('/', '_blank')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors w-full px-2 py-1.5 rounded-md hover:bg-gray-100"
                >
                    <ExternalLink size={16} />
                    <span>Back to Portfolio</span>
                </button>
            </SidebarFooter>
        </Sidebar>
    );
};

export default DashboardSidebar;
