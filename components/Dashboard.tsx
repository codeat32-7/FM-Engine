
import React from 'react';
import { ServiceRequest, SRStatus, SRSource } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { CheckCircle, Activity, Clock, MessageSquare, Monitor } from 'lucide-react';

interface DashboardProps {
  srs: ServiceRequest[];
}

const Dashboard: React.FC<DashboardProps> = ({ srs }) => {
  const resolvedCount = srs.filter(sr => sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED).length;
  const completionRate = srs.length > 0 ? Math.round((resolvedCount / srs.length) * 100) : 0;

  const chartData = [
    { name: 'New', count: srs.filter(sr => sr.status === SRStatus.NEW).length, color: '#60A5FA' },
    { name: 'In Progress', count: srs.filter(sr => sr.status === SRStatus.IN_PROGRESS).length, color: '#3B82F6' },
    { name: 'Resolved', count: srs.filter(sr => sr.status === SRStatus.RESOLVED).length, color: '#2563EB' },
    { name: 'Closed', count: srs.filter(sr => sr.status === SRStatus.CLOSED).length, color: '#1E40AF' },
  ];

  const recentActivity = srs.slice(0, 5).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Resolved</p>
              <p className="text-4xl font-bold text-slate-800">{resolvedCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <CheckCircle className="text-slate-400 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Completion Rate</p>
              <p className="text-4xl font-bold text-slate-800">{completionRate}%</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">All time</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <Activity className="text-slate-400 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-8">Request Status Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  fontSize={12} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="p-6 flex gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <div className="mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight mb-0.5">{activity.title}</p>
                    <p className="text-xs text-slate-500 mb-1">{activity.description.slice(0, 40)}...</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      <span>{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>via</span>
                      <span className="flex items-center gap-1">
                        {activity.source === SRSource.WHATSAPP ? <MessageSquare size={10} /> : <Monitor size={10} />}
                        {activity.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-slate-400 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
