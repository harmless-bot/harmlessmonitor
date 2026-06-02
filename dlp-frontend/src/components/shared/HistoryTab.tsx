import React, { useState, useMemo } from 'react';
import { useDlpStore } from '../../store/useDlpStore';
import { format } from 'date-fns';
import { Download, Search, ArrowUpDown } from 'lucide-react';

export default function HistoryTab() {
  const history = useDlpStore(state => state.history);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string>('timestamp_ms');
  const [sortDesc, setSortDesc] = useState(true);

  const filteredData = useMemo(() => {
    return history.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        item.src.toLowerCase().includes(term) ||
        item.dst.toLowerCase().includes(term) ||
        item.protocol.toLowerCase().includes(term) ||
        (item.is_threat ? 'threat' : 'clean').includes(term)
      );
    }).sort((a: any, b: any) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      
      // Handle boolean sorting for status
      if (sortCol === 'is_threat') {
        aVal = a.is_threat ? 1 : 0;
        bVal = b.is_threat ? 1 : 0;
      }
      
      if (aVal < bVal) return sortDesc ? 1 : -1;
      if (aVal > bVal) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [history, searchTerm, sortCol, sortDesc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDesc(!sortDesc);
    else {
      setSortCol(col);
      setSortDesc(true);
    }
  };

  const exportCsv = () => {
    const headers = ['Time', 'Source IP', 'Destination IP', 'Protocol', 'Bandwidth (bps)', 'Status'];
    const rows = filteredData.map(r => [
      format(new Date(r.timestamp_ms), 'yyyy-MM-dd HH:mm:ss.SSS'),
      r.src,
      r.dst,
      r.protocol,
      r.bandwidth_bps.toString(),
      r.is_threat ? 'THREAT' : 'CLEAN'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-history-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-gray-200">PACKET HISTORY LOG</h1>
          <p className="text-sm text-gray-500 mt-1">Showing last 500 captured flows</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/50 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded text-sm text-gray-200 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-white/5 sticky top-0 z-10">
              <tr>
                {['Time', 'Source IP', 'Destination IP', 'Protocol', 'Bytes', 'Status'].map((header, i) => {
                  const keyMap = ['timestamp_ms', 'src', 'dst', 'protocol', 'bandwidth_bps', 'is_threat'];
                  return (
                    <th key={header} className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort(keyMap[i])}>
                      <div className="flex items-center gap-2">
                        {header}
                        <ArrowUpDown size={12} className={sortCol === keyMap[i] ? 'text-white' : 'text-gray-600'} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredData.map((row, i) => (
                <tr key={`${row.flow_id}-${row.timestamp_ms}-${i}`} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{format(new Date(row.timestamp_ms), 'HH:mm:ss.SSS')}</td>
                  <td className="px-4 py-3 text-gray-300">{row.src}</td>
                  <td className="px-4 py-3 text-gray-300">{row.dst}</td>
                  <td className="px-4 py-3 text-gray-500">{row.protocol}</td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums">{row.bandwidth_bps.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {row.is_threat ? (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-sans font-bold tracking-wider">THREAT DETECTED</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] font-sans font-bold tracking-wider">CLEAN</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                    No matching flows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
