import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LiveSessions from './components/LiveSessions';
import AIAnalyst from './components/AIAnalyst';
import { useWebSocket } from './hooks/useWebSocket';

import Overview from './components/Overview';

import PacketExplorer from './components/PacketExplorer';
import Settings from './components/Settings';
import Alerts from './components/Alerts';
import Integrations from './components/Integrations';
import DestinationIntelligence from './components/DestinationIntelligence';

function App() {
  // Initialize WebSocket connection to new FastAPI backend
  useWebSocket();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="sessions" element={<LiveSessions />} />
          <Route path="packets" element={<PacketExplorer />} />
          <Route path="intelligence" element={<DestinationIntelligence />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="ai" element={<AIAnalyst />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
