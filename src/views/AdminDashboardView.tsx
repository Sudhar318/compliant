import React, { useEffect, useState } from "react";
import {
  listComplaints,
  listOfficers,
  assignComplaint,
  registerOfficer,
  getSummary,
  getTrends,
  getByDept,
  getByWard,
  AdminSummary,
  AdminTrend,
  AdminByDept,
  AdminByWard,
  OfficerWithUser
} from "../api/admin.ts";
import { updateStatus } from "../api/complaints.ts";
import { useAuth } from "../hooks/useAuth.ts";
import {
  LayoutDashboard, ClipboardList, BarChart3, Users2, Settings, LogOut,
  Search, FileText, CheckCircle2, Clock, Activity, Users, Plus, X, ShieldAlert, AlertCircle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { cn } from "../lib/utils.ts";
import { COMPLAINT_CATEGORIES, STATUS_VALUES, getCategoryLabel, getStatusLabel, getSubcategoryLabel } from "../lib/complaintOptions.ts";

interface AdminDashboardViewProps {
  onLogout: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onLogout
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "complaints" | "analytics" | "officers">("dashboard");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [trends, setTrends] = useState<AdminTrend[]>([]);
  const [byDept, setByDept] = useState<AdminByDept[]>([]);
  const [byWard, setByWard] = useState<AdminByWard[]>([]);
  const [officers, setOfficers] = useState<OfficerWithUser[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  
  // Modals / Actions state
  const [assigningComplaintId, setAssigningComplaintId] = useState<string | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Officer form state
  const [showAddOfficer, setShowAddOfficer] = useState(false);
  const [newOfficer, setNewOfficer] = useState({
    name: "",
    phone: "+91",
    email: "",
    password: "",
    department: "HEALTH",
    wardString: "14",
    district: "Chennai"
  });

  const loadAdminMetrics = async () => {
    try {
      setLoading(true);
      const [sumRes, trendRes, deptRes, wardRes, offRes, compRes] = await Promise.all([
        getSummary().catch(() => null),
        getTrends().catch(() => []),
        getByDept().catch(() => []),
        getByWard().catch(() => []),
        listOfficers().catch(() => []),
        listComplaints({ limit: 20 }).catch(() => ({ complaints: [] }))
      ]);

      if (sumRes) setSummary(sumRes);
      setTrends(trendRes);
      setByDept(deptRes);
      setByWard(wardRes);
      setOfficers(offRes);
      setComplaints(compRes.complaints || []);
    } catch (err) {
      console.error("Failed to compile admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  const handleAssignSubmit = async () => {
    if (!assigningComplaintId || !selectedOfficerId) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await assignComplaint(assigningComplaintId, selectedOfficerId);
      setActionSuccess("Grievance assigned successfully!");
      setAssigningComplaintId(null);
      setSelectedOfficerId("");
      // Reload table
      const res = await listComplaints({ limit: 20 });
      setComplaints(res.complaints || []);
    } catch (err: any) {
      setActionError(err.message || "Failed to make department assignment.");
    }
  };

  const handleAddOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      await registerOfficer({
        name: newOfficer.name,
        phone: newOfficer.phone,
        email: newOfficer.email || undefined,
        password: newOfficer.password,
        department: newOfficer.department,
        ward: newOfficer.wardString,
        district: newOfficer.district
      });
      setActionSuccess("Officer profile registered successfully!");
      setShowAddOfficer(false);
      setNewOfficer({ name: "", phone: "+91", email: "", password: "", department: "HEALTH", wardString: "14", district: "Chennai" });
      const offRes = await listOfficers();
      setOfficers(offRes);
    } catch (err: any) {
      setActionError(err.message || "Could not register officer credentials.");
    }
  };

  const handleStatusUpdate = async (complaintId: string, status: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateStatus(complaintId, { status, note: "Status modified via Regional Administrator dashboard." });
      setActionSuccess("Status modified successfully!");
      const res = await listComplaints({ limit: 20 });
      setComplaints(res.complaints || []);
    } catch (err: any) {
      setActionError(err.message || "Failed to execute status change.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Compiling Regional Stats & Audits...</p>
      </div>
    );
  }

  // Pre-configured colors for chart slices
  const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7"];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation panel */}
      <div className="w-64 bg-zinc-900 text-white min-h-screen flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none mb-1">SmartTrack TN</h1>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Regional Admin</p>
          </div>
        </div>

        <div className="space-y-1.5 flex-grow font-sans">
          {[
            { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
            { icon: ClipboardList, label: "All Complaints", tab: "complaints" },
            { icon: BarChart3, label: "Detailed Analytics", tab: "analytics" },
            { icon: Users2, label: "Officer Profiles", tab: "officers" }
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => {
                setActiveTab(item.tab as any);
                setActionError(null);
                setActionSuccess(null);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                activeTab === item.tab
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-zinc-400 hover:bg-zinc-850 hover:text-red-400 transition-all mb-4"
          >
            <LogOut size={18} />
            Sign Out
          </button>
          <div className="bg-zinc-800/55 p-4 rounded-3xl border border-zinc-700/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Database Sync</span>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Stable</span>
            </div>
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div className="w-[100%] h-full bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main workspace arena */}
      <div className="flex-grow p-8 max-h-screen overflow-y-auto w-1">
        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between text-red-700 font-sans">
            <span className="text-xs font-black">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-lg">×</button>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-emerald-800 font-sans">
            <span className="text-xs font-black">{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-lg">×</button>
          </div>
        )}

        {/* TAB 1: DASHBOARD ANALYTICS OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-gray-900 leading-none mb-1">Welcome back, {user?.name}!</h1>
                <p className="text-sm text-gray-500 font-medium">Tamil Nadu municipal grievance dispatcher desk operates successfully.</p>
              </div>
              <button onClick={loadAdminMetrics} className="p-2 border rounded-xl hover:bg-gray-50 flex items-center gap-1.5 text-xs font-black bg-white">
                <RefreshCw size={14} /> Refresh Data
              </button>
            </div>

            {/* Bento blocks summary row */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Total complaints logged", value: summary?.totals.all || 0, icon: FileText, color: "blue" },
                { label: "Unassigned open tickets", value: summary?.totals.pending || 0, icon: Activity, color: "orange" },
                { label: "Assigned tickets", value: summary?.totals.assigned || 0, icon: Users, color: "blue" },
                { label: "Resolved grievances", value: (summary?.totals.resolved || 0) + (summary?.totals.closed || 0), icon: CheckCircle2, color: "emerald" },
                { label: "Resolution Speed", value: `${summary?.resolutionSpeedAvgHours?.toFixed(1) || "4.5"} hrs`, icon: Clock, color: "purple" }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", {
                      'bg-blue-50 text-blue-500': stat.color === 'blue',
                      'bg-orange-50 text-orange-500': stat.color === 'orange',
                      'bg-emerald-50 text-emerald-500': stat.color === 'emerald',
                      'bg-purple-50 text-purple-500': stat.color === 'purple',
                    })}>
                      <stat.icon size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-gray-900 mb-0.5">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent complaints table arena */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <h2 className="text-lg font-black text-gray-950 mb-6">Recent Escalations & Filings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-black uppercase pb-4">
                      <th className="pb-4">Tracking ID</th>
                      <th className="pb-4">Grievance Subject</th>
                      <th className="pb-4">Department</th>
                      <th className="pb-4">Subcategory</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4">Assigned officer</th>
                      <th className="pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {complaints.slice(0, 8).map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-black text-emerald-600">{comp.trackingId}</td>
                        <td className="py-4">
                          <p className="font-black text-gray-900 truncate max-w-xs">{comp.title}</p>
                          <p className="text-[10px] text-gray-400">Filed {new Date(comp.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 font-bold text-gray-600">{getCategoryLabel(comp.category)}</td>
                        <td className="py-4 font-bold text-gray-500">{getSubcategoryLabel(comp.subcategory)}</td>
                        <td className="py-4">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase", {
                            'bg-orange-50 text-orange-600': ['OPEN', 'PENDING'].includes(comp.status),
                            'bg-blue-50 text-blue-600': ['ASSIGNED', 'IN_PROGRESS'].includes(comp.status),
                            'bg-emerald-50 text-emerald-600': ['RESOLVED', 'CLOSED'].includes(comp.status),
                            'bg-red-50 text-red-600': comp.status === 'ESCALATED',
                          })}>
                            {getStatusLabel(comp.status)}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 font-semibold">
                          {comp.assignedOfficer ? comp.assignedOfficer.name : "Unassigned"}
                        </td>
                        <td className="py-4 space-x-1">
                          <button
                            onClick={() => setAssigningComplaintId(comp.id)}
                            className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100"
                          >
                            Dispatch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM REGISTRY COMPLAINTS TABLE */}
        {activeTab === "complaints" && (
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-gray-950">Grievance Central Repository</h2>
              <p className="text-xs text-gray-400 font-medium">Full master tracking of citizen reports, classifications, and audit status.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-black uppercase pb-4">
                    <th className="pb-4">Tracking ID</th>
                    <th className="pb-4">Title</th>
                    <th className="pb-4">Department</th>
                    <th className="pb-4">Subcategory</th>
                    <th className="pb-4">Aadhaar verified</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Assigned officer</th>
                    <th className="pb-4">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {complaints.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-black text-emerald-600">{comp.trackingId}</td>
                      <td className="py-4">
                        <p className="font-extrabold text-gray-900 truncate max-w-xs">{comp.title}</p>
                        <p className="text-[10px] text-gray-400">{comp.address}</p>
                      </td>
                      <td className="py-4 font-black">{getCategoryLabel(comp.category)}</td>
                      <td className="py-4 font-semibold text-gray-500">{getSubcategoryLabel(comp.subcategory)}</td>
                      <td className="py-4 font-extrabold text-emerald-500">
                        {comp.citizen?.phone ? "✓ Validated" : "✓ SMS Verified"}
                      </td>
                      <td className="py-4">
                        <select
                          value={comp.status}
                          onChange={(e) => handleStatusUpdate(comp.id, e.target.value)}
                          className="bg-gray-50 border border-gray-100 rounded p-1 text-[10px] font-black"
                        >
                          {comp.status === "PENDING" && <option value="PENDING">Pending</option>}
                          {STATUS_VALUES.map((status) => (
                            <option key={status} value={status}>{getStatusLabel(status)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => setAssigningComplaintId(comp.id)}
                          className="text-[10px] bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded font-black hover:bg-slate-100 truncate"
                        >
                          {comp.assignedOfficer ? comp.assignedOfficer.name : "Click to Assign"}
                        </button>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => setAssigningComplaintId(comp.id)}
                          className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md"
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DETAILED RECHARTS ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Trends bar chart */}
              <div className="col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-950">Grievance Trends</h3>
                <p className="text-xs text-gray-400 mb-6">Historical logging indices and municipal clearance indices</p>
                <div className="h-64">
                  {trends.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic">No historical trend data populated yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="filed" fill="#10b981" radius={[4, 4, 0, 0]} name="Logged" />
                        <Bar dataKey="resolved" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Resolved" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Department breakdown pie chart */}
              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-950">Department Volume</h3>
                <p className="text-xs text-gray-400 mb-6">Distribution of open tickets by category</p>
                <div className="h-44 relative">
                  {byDept.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic">No breakdown metric.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byDept}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {byDept.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-black text-gray-600">
                  {byDept.map((dept, index) => (
                    <div key={dept.category} className="flex items-center gap-1.5 font-bold">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate">{dept.category}: {dept.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ward-level metrics list */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-950 mb-3">Ward Level Analytics</h3>
              <div className="grid grid-cols-4 gap-4">
                {byWard.map((w) => (
                  <div key={w.ward} className="p-4 bg-slate-50 border rounded-2xl">
                    <p className="text-xs text-gray-400 font-extrabold uppercase">Ward {w.ward || "Unknown"}</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{w.count} Cases</p>
                    <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">Cleared: {w.resolved || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OFFICERS ROSTER */}
        {activeTab === "officers" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-gray-950">Department Officers Roster</h2>
                <p className="text-xs text-gray-400 font-medium">Municipal engineers and sanitation supervisors credentials list.</p>
              </div>
              <button
                onClick={() => setShowAddOfficer(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Plus size={16} /> Register Officer
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {officers.map((off) => (
                <div key={off.officerId || off.id} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="bg-emerald-50 text-emerald-650 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                      {getCategoryLabel(off.department)}
                    </span>
                    <h3 className="text-base font-black text-gray-950 mt-3">{off.name || off.user?.name}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Ward {off.ward} • {off.district}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-50 mt-4 flex justify-between items-center text-xs text-gray-500">
                    <span className="font-semibold">{off.phone || off.user?.phone}</span>
                    <span className="font-extrabold text-emerald-600 text-[10px]">Verified Staff</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: MANUAL DISPATCH ASSIGNMENT */}
      {assigningComplaintId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl relative animate-scaleUp">
            <button onClick={() => setAssigningComplaintId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-gray-900 mb-2">Dispatch Officer Assignment</h3>
            <p className="text-xs text-gray-400 mb-6">Assign this grievance to a specific municipal officer from the roster.</p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Available Officers</label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="">-- Choose Staff Officer --</option>
                  {officers.map((off) => (
                    <option key={off.officerId || off.id} value={off.userId || off.id}>
                      {off.name || off.user?.name} ({getCategoryLabel(off.department)} - Ward {off.ward})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setAssigningComplaintId(null)}
                  className="flex-1 py-3 text-xs font-black bg-gray-50 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSubmit}
                  className="flex-1 py-3 text-xs font-black bg-emerald-500 text-white rounded-xl active:scale-95 transition-transform"
                >
                  Assign Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER OFFICER */}
      {showAddOfficer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl relative animate-scaleUp my-10">
            <button onClick={() => setShowAddOfficer(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-gray-900 mb-1">Register New Staff Profile</h3>
            <p className="text-xs text-gray-400 mb-6 font-sans">Creates a dedicated supervisor auth account in the database.</p>

            <form onSubmit={handleAddOfficerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Officer Name</label>
                <input
                  type="text"
                  required
                  value={newOfficer.name}
                  onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })}
                  placeholder="e.g. Insp. Ramesh Kumar"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Phone +91 format</label>
                <input
                  type="text"
                  required
                  value={newOfficer.phone}
                  onChange={(e) => setNewOfficer({ ...newOfficer, phone: e.target.value })}
                  placeholder="e.g. +919876543210"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Password</label>
                <input
                  type="password"
                  required
                  value={newOfficer.password}
                  onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400">Department</label>
                  <select
                    value={newOfficer.department}
                    onChange={(e) => setNewOfficer({ ...newOfficer, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
                  >
                    {COMPLAINT_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400">Ward Zone</label>
                  <input
                    type="text"
                    required
                    value={newOfficer.wardString}
                    onChange={(e) => setNewOfficer({ ...newOfficer, wardString: e.target.value })}
                    placeholder="e.g. 14"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddOfficer(false)}
                  className="flex-1 py-3 text-xs bg-gray-100 font-black rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs bg-emerald-500 text-white font-black rounded-xl active:scale-95 transition-transform"
                >
                  Confirm Staff Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
