import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.ts";
import { listComplaints } from "../api/complaints.ts";
import { listNotifications } from "../api/notifications.ts";
import { Bell, ClipboardList, Clock, CheckCircle2, Activity, Database, Smartphone, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils.ts";

interface DashboardViewProps {
  onNavigate: (v: any) => void;
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onLogout
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, resolved: 0, total: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Citizen complaints
      const complaintsRes = await listComplaints({ limit: 100 });
      const complaints = complaintsRes.complaints || [];

      const total = complaints.length;
      const pending = complaints.filter(c => ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
      const resolved = complaints.filter(c => ["RESOLVED", "CLOSED"].includes(c.status)).length;

      setStats({ pending, resolved, total });

      // 2. Unread notification badge count
      const notifRes = await listNotifications();
      const unread = (notifRes.notifications || []).filter(n => !n.read).length;
      setUnreadCount(unread);

      // 3. Extract recent activity items
      const recent = complaints.slice(0, 3).map((item: any) => {
        const isResolved = ["RESOLVED", "CLOSED"].includes(item.status);
        return {
          id: item.id,
          title: item.title,
          desc: `Case #${item.trackingId} status: ${item.status}`,
          time: new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: isResolved ? 'emerald' : 'orange',
          icon: isResolved ? CheckCircle2 : Clock
        };
      });
      setRecentActivities(recent);
    } catch (err) {
      console.error("Failed to load citizen stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 py-4 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            TN
          </div>
          <h1 className="text-lg font-bold text-gray-900">SmartTrack TN</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate("notifications")} className="text-gray-600 relative p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>
          <button onClick={onLogout} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
            Logout
          </button>
        </div>
      </div>

      <div className="p-4 pt-6 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">Hello, {user?.name || "Citizen"}!</h2>
          <p className="text-sm text-gray-500 font-medium">Everything looks stable in Ward {user?.ward || "Unknown"} today.</p>
        </div>

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: stats.pending, color: "orange", icon: Clock },
            { label: "Resolved", value: stats.resolved, color: "emerald", icon: CheckCircle2 },
            { label: "Total", value: stats.total, color: "blue", icon: ClipboardList }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:scale-105 transition-transform duration-300">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", {
                  'bg-orange-50 text-orange-500': stat.color === 'orange',
                  'bg-emerald-50 text-emerald-500': stat.color === 'emerald',
                  'bg-blue-50 text-blue-500': stat.color === 'blue',
                })}>
                  <Icon size={16} />
                </div>
                <p className="text-2xl font-black text-gray-900">{loading ? "..." : stat.value}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Banner */}
        <div className="bg-emerald-500 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-white px-2 py-0.5 rounded-lg text-emerald-600 font-bold text-[8px] uppercase tracking-widest">Global Analysis</div>
              <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest">Tamil Nadu Smart Cities</p>
            </div>
            <h3 className="text-lg font-black mb-2 leading-tight">Trending: Efficient Waste Clearance in Zone {user?.ward || "Local"}</h3>
            <p className="text-sm text-emerald-50/80 mb-6 font-medium">94% of sanitation tickets in your ward were resolved within 24 hours.</p>
            <button onClick={() => onNavigate("file-complaint")} className="bg-white text-emerald-600 px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-transform">
              File New Grievance
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        </div>

        {/* Recent Activities Section */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent Activity</h3>
            <button onClick={() => onNavigate("complaints")} className="text-xs font-black text-emerald-600 hover:underline">
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-16 bg-white border border-gray-100 rounded-3xl animate-pulse"></div>
              <div className="h-16 bg-white border border-gray-100 rounded-3xl animate-pulse"></div>
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center italic py-4">No recent grievance logged. Feel free to report if any local hazard exists.</p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} onClick={() => onNavigate("complaints")} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-3xl items-center shadow-sm hover:scale-[1.02] cursor-pointer transition-transform">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", {
                      'bg-emerald-50 text-emerald-500': item.color === 'emerald',
                      'bg-orange-50 text-orange-500': item.color === 'orange',
                    })}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-xs font-black text-gray-900 truncate">{item.title}</h4>
                      <p className="text-[10px] text-gray-400 font-bold truncate">{item.desc}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 font-black whitespace-nowrap">{item.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Directory list */}
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Departments Directory</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Activity, label: 'Health', color: 'bg-red-50 text-red-500', cat: 'SANITATION' },
              { icon: Database, label: 'Water', color: 'bg-blue-50 text-blue-500', cat: 'WATER_SUPPLY' },
              { icon: Smartphone, label: 'Roads', color: 'bg-purple-50 text-purple-500', cat: 'ROADS' },
              { icon: ShieldCheck, label: 'Electricity', color: 'bg-emerald-50 text-emerald-500', cat: 'ELECTRICITY' }
            ].map((dept, idx) => {
              const Icon = dept.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onNavigate("file-complaint")}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", dept.color)}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{dept.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
