import React, { useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, MapPin, ShieldAlert, Cpu, 
  Navigation, Layers, TrendingUp, Info, Video
} from 'lucide-react';
import { PotholeData, DashboardStats } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  data: PotholeData[];
  fileName: string;
  videoUrl?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ data, fileName, videoUrl }) => {
  const stats = useMemo<DashboardStats>(() => {
    if (!data || data.length === 0) {
      return {
        totalPotholes: 0,
        avgConfidence: 0,
        avgSeverity: 0,
        totalFrames: 0,
        avgProcessingTime: 0,
        maxAltitude: 0,
        minAltitude: 0,
      };
    }

    const totalPotholes = data.reduce((acc, curr) => acc + (Number(curr.pothole_count) || 0), 0);
    const avgConfidence = data.reduce((acc, curr) => acc + (Number(curr.average_confidence) || 0), 0) / data.length;
    const avgSeverity = data.reduce((acc, curr) => acc + (Number(curr.severity) || 0), 0) / data.length;
    const totalFrames = data.reduce((acc, curr) => acc + (Number(curr.frames_with_detection) || 0), 0);
    const avgProcessingTime = data.reduce((acc, curr) => acc + (Number(curr.time_processing) || 0), 0) / data.length;
    const altitudes = data.map(d => Number(d.altitude) || 0);
    
    return {
      totalPotholes,
      avgConfidence: isNaN(avgConfidence) ? 0 : Number(avgConfidence.toFixed(2)),
      avgSeverity: isNaN(avgSeverity) ? 0 : Number(avgSeverity.toFixed(2)),
      totalFrames,
      avgProcessingTime: isNaN(avgProcessingTime) ? 0 : Number(avgProcessingTime.toFixed(2)),
      maxAltitude: Math.max(...altitudes),
      minAltitude: Math.min(...altitudes),
    };
  }, [data]);

  const severityData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1-5
    data.forEach(d => {
      const s = Math.min(Math.max(Math.round(d.severity), 1), 5);
      counts[s - 1]++;
    });
    return counts.map((count, i) => ({ name: `Level ${i + 1}`, value: count }));
  }, [data]);

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  const formatNum = (val: any, decimals: number = 2) => {
    const n = Number(val);
    return isNaN(n) ? (0).toFixed(decimals) : n.toFixed(decimals);
  };

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const dataQuality = useMemo(() => {
    if (data.length === 0) return 0;
    const criticalFields: (keyof PotholeData)[] = ['pothole_count', 'severity', 'average_confidence'];
    let validCount = 0;
    data.forEach(d => {
      criticalFields.forEach(f => {
        if (d[f] !== undefined && d[f] !== null && !isNaN(Number(d[f]))) {
          validCount++;
        }
      });
    });
    return (validCount / (data.length * criticalFields.length)) * 100;
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis: {fileName}</h2>
          <p className="text-gray-500">
            Detailed breakdown of {data.length} data points 
            <span className={cn(
              "ml-2 text-xs font-bold px-2 py-0.5 rounded-full",
              dataQuality > 90 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              Quality: {dataQuality.toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
          <Info size={16} />
          GPS Status: {data[0]?.gps_status || 'N/A'}
        </div>
      </div>

      {videoUrl && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Video size={20} className="text-purple-500" />
            Analyzed Video Source
          </h4>
          <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-inner relative group">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 right-4 bg-purple-600/90 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              AI OVERLAY ACTIVE
            </div>
          </div>
          <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm text-purple-800 font-medium">
              Note: The AI model has processed this video and extracted the parameters shown in the charts below.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Potholes" 
          value={stats.totalPotholes} 
          icon={Layers} 
          color="bg-red-50 text-red-600"
          subtext={`${stats.totalFrames} frames with detection`}
        />
        <StatCard 
          title="Avg Confidence" 
          value={`${(stats.avgConfidence * 100).toFixed(1)}%`} 
          icon={TrendingUp} 
          color="bg-blue-50 text-blue-600"
          subtext="Detection precision metric"
        />
        <StatCard 
          title="Avg Severity" 
          value={stats.avgSeverity} 
          icon={ShieldAlert} 
          color="bg-amber-50 text-amber-600"
          subtext="Scale 1 (Low) to 5 (High)"
        />
        <StatCard 
          title="Processing Time" 
          value={`${stats.avgProcessingTime}ms`} 
          icon={Cpu} 
          color="bg-emerald-50 text-emerald-600"
          subtext="Avg time per frame"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pothole Count Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            Detection Timeline
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pothole_count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Potholes Detected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-500" />
            Severity Distribution
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence vs Altitude Scatter */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Navigation size={20} className="text-emerald-500" />
            Confidence vs Altitude
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  dataKey="altitude" 
                  name="Altitude" 
                  unit="m" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="average_confidence" 
                  name="Confidence" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <ZAxis type="number" dataKey="severity" range={[50, 400]} name="Severity" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Detections" data={data} fill="#10b981" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Time Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Cpu size={20} className="text-purple-500" />
            Processing Performance
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 100)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="time_processing" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spatial Distribution (Simplified Map) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin size={20} className="text-red-500" />
          Spatial Detection Map
        </h4>
        <div className="h-[400px] w-full bg-gray-50 rounded-xl relative overflow-hidden border border-gray-100">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
              <XAxis 
                type="number" 
                dataKey="longitude" 
                name="Longitude" 
                domain={['auto', 'auto']} 
                hide
              />
              <YAxis 
                type="number" 
                dataKey="latitude" 
                name="Latitude" 
                domain={['auto', 'auto']} 
                hide
              />
              <ZAxis type="number" dataKey="pothole_count" range={[100, 1000]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
                        <p className="font-bold text-gray-900 mb-1">Detection Point</p>
                        <p className="text-gray-500">Lat: {d.latitude.toFixed(6)}</p>
                        <p className="text-gray-500">Long: {d.longitude.toFixed(6)}</p>
                        <p className="text-red-600 font-bold mt-1">Potholes: {d.pothole_count}</p>
                        <p className="text-amber-600 font-bold">Severity: {d.severity}/5</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Potholes" data={data} fill="#ef4444">
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.severity > 3 ? '#ef4444' : '#f59e0b'} 
                    fillOpacity={Math.max(0.3, entry.average_confidence)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur p-3 rounded-lg border border-gray-200 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>High Severity ({'>'}3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Low/Medium Severity</span>
            </div>
            <div className="text-gray-400 italic mt-1">Opacity represents confidence level</div>
          </div>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers size={20} className="text-blue-500" />
            Extracted Parameter Data
          </h4>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            {data.length} Total Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Coordinates</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Altitude</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">GPS Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Potholes</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Severity</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Confidence</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Proc. Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-600 font-mono">
                    {formatDate(row.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 text-center font-mono">
                    {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{formatNum(row.altitude)}m</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      row.gps_status === 'Fixed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {row.gps_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center">{row.pothole_count}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            idx < row.severity ? "bg-red-500" : "bg-gray-200"
                          )} 
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(Number(row.average_confidence) || 0) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center font-mono">{row.time_processing}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 100 && (
            <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 italic">
              Showing first 100 records. Download full dataset for complete analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
