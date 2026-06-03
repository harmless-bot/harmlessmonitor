import { create } from 'zustand';
import type { Flow, FlowHistoryItem, SystemStats } from '../types';

interface DlpState {
  flows: Flow[];
  alerts: Flow[];
  history: FlowHistoryItem[];
  stats: SystemStats;
  investigatingFlow: Flow | null;
  investigatingAlert: Flow | null;
  wsStatus: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';
  usingDemoData: boolean;
  
  addFlow: (flow: Flow) => void;
  updateFlow: (flow: Flow) => void;
  addAlert: (alert: Flow) => void;
  clearAlerts: () => void;
  setInvestigatingFlow: (flow: Flow | null) => void;
  setInvestigatingAlert: (flow: Flow | null) => void;
  setWsStatus: (status: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE') => void;
}

const isAlert = (flow: Flow) => ['medium', 'high', 'critical'].includes(flow.risk_level);

const toHistoryItem = (flow: Flow): FlowHistoryItem => ({
  flow_id: flow.flow_id,
  timestamp_ms: flow.timestamp_ms ?? Date.parse(flow.timestamp_start),
  src: flow.src_ip,
  dst: flow.dst_ip,
  bandwidth_bps: Math.round((flow.bytes_out + flow.bytes_in) / 60),
  sensitive_count: flow.is_sensitive || isAlert(flow) ? 1 : 0,
  protocol: flow.protocol,
  is_threat: isAlert(flow)
});

const toFlowStat = (flow: Flow) => {
  const historyItem = toHistoryItem(flow);
  return {
    flow_id: historyItem.flow_id,
    src: historyItem.src,
    dst: historyItem.dst,
    bandwidth_bps: historyItem.bandwidth_bps,
    sensitive_count: historyItem.sensitive_count,
    lat: flow.lat,
    lon: flow.lon
  };
};

export const useDlpStore = create<DlpState>((set) => ({
  flows: [],
  alerts: [],
  history: [],
  stats: { packets_total: 0, sensitive_total: 0, fps: 0, latency_ms: 0, flows: [] },
  investigatingFlow: null,
  investigatingAlert: null,
  wsStatus: 'OFFLINE',
  usingDemoData: false,

  addFlow: (flow) => set((state) => {
    const nextFlow = { simulated: false, ...flow };
    const flowsWithoutExisting = state.flows.filter(f => f.flow_id !== nextFlow.flow_id);
    const nextFlows = [nextFlow, ...flowsWithoutExisting].slice(0, 500);
    const nextAlerts = isAlert(nextFlow)
      ? [nextFlow, ...state.alerts.filter(f => f.flow_id !== nextFlow.flow_id)].slice(0, 50)
      : state.alerts.filter(f => f.flow_id !== nextFlow.flow_id);
    const nextHistory = [toHistoryItem(nextFlow), ...state.history.filter(f => f.flow_id !== nextFlow.flow_id)].slice(0, 500);
    return {
      flows: nextFlows,
      alerts: nextAlerts,
      history: nextHistory,
      stats: {
        packets_total: Math.max(state.stats.packets_total + nextFlow.packet_count, nextFlows.reduce((acc, f) => acc + f.packet_count, 0)),
        sensitive_total: nextAlerts.length,
        fps: state.stats.fps,
        latency_ms: state.stats.latency_ms,
        flows: nextFlows.map(toFlowStat)
      },
      usingDemoData: false
    };
  }),

  updateFlow: (flow) => set((state) => ({
      flows: state.flows.map(f => f.flow_id === flow.flow_id ? flow : f),
      alerts: state.alerts.map(f => f.flow_id === flow.flow_id ? flow : f)
  })),
  
  addAlert: (alert) => set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
      flows: [alert, ...state.flows.filter(f => f.flow_id !== alert.flow_id)].slice(0, 500)
  })),

  clearAlerts: () => set({ alerts: [] }),
  setInvestigatingFlow: (flow) => set({ investigatingFlow: flow }),
  setInvestigatingAlert: (flow) => set({ investigatingAlert: flow }),
  setWsStatus: (status) => set({ wsStatus: status }),
}));
