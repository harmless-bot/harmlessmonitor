import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Globe2, 
  Search, 
  ShieldAlert, 
  BrainCircuit, 
  Settings,
  Blocks,
  LayoutDashboard
} from 'lucide-react';
import { useDlpStore } from '../../store/useDlpStore';
export default function Layout() {
  const location = useLocation();
  const wsStatus = useDlpStore(state => state.wsStatus);

  const navItems = [
    { path: '/', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { path: '/sessions', label: 'Live Sessions', icon: <Activity size={18} /> },
    { path: '/packets', label: 'Packet Explorer', icon: <Search size={18} /> },
    { path: '/intelligence', label: 'Domain Intelligence', icon: <Globe2 size={18} /> },
    { path: '/alerts', label: 'Alerts', icon: <ShieldAlert size={18} /> },
    { path: '/ai', label: 'AI Analyst', icon: <BrainCircuit size={18} /> },
    { path: '/integrations', label: 'Integrations', icon: <Blocks size={18} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-300 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-gray-800 flex flex-col z-20">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)]/20 flex items-center justify-center border border-[var(--color-primary)]">
            <ShieldAlert size={16} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-gray-100 leading-tight">HARMLESS</h1>
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Exfiltration Monitor</h2>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-bold tracking-widest text-gray-600 uppercase">Analysis Console</div>
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive 
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 p-2 rounded bg-black/50 border border-gray-800">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
            <span className="text-xs font-mono text-gray-400">
              {wsStatus === 'CONNECTED' ? 'Engine Online' : 'Engine Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Topbar Command Bar */}
        <header className="h-14 bg-[#111] border-b border-gray-800 flex items-center justify-between px-6 z-10">
          <div className="flex items-center bg-black/50 border border-gray-800 rounded px-3 py-1.5 w-96">
            <Search size={14} className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search flows, domains, IP, or alerts (Cmd+K)" 
              className="bg-transparent border-none outline-none text-sm text-gray-300 w-full placeholder-gray-600"
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm font-mono text-gray-500">
            <span>Local Node: EN0</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">LIVE</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
