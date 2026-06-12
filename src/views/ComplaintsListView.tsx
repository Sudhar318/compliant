import React, { useEffect, useState } from "react";
import { listComplaints } from "../api/complaints.ts";
import { Search, ChevronLeft, Menu, Clock, CheckCircle2, MessageSquare, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { getCategoryLabel, getStatusLabel, getSubcategoryLabel } from "../lib/complaintOptions.ts";

interface ComplaintsListViewProps {
  onNavigate: (v: any) => void;
  onSelectComplaint: (id: string) => void;
}

export const ComplaintsListView: React.FC<ComplaintsListViewProps> = ({
  onNavigate,
  onSelectComplaint
}) => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debouncing search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      // Map filter selection to API params
      let apiStatus = undefined;
      if (filterStatus === "ASSIGNED") apiStatus = "ASSIGNED";
      else if (filterStatus === "IN_PROGRESS") apiStatus = "IN_PROGRESS";
      else if (filterStatus === "RESOLVED") apiStatus = "RESOLVED";

      const res = await listComplaints({
        page,
        limit: 5,
        status: apiStatus,
        search: debouncedSearch || undefined
      });

      // Filter locally for status if backend status needs special handling
      let list = res.complaints || [];
      if (filterStatus === "OPEN") {
        list = list.filter((c: any) => ["OPEN", "PENDING"].includes(c.status));
      } else if (filterStatus === "ASSIGNED") {
        list = list.filter((c: any) => c.status === "ASSIGNED");
      } else if (filterStatus === "IN_PROGRESS") {
        list = list.filter((c: any) => c.status === "IN_PROGRESS");
      } else if (filterStatus === "RESOLVED") {
        list = list.filter((c: any) => ["RESOLVED", "CLOSED"].includes(c.status));
      }

      setComplaints(list);
      setTotalCount(res.pagination?.total || list.length);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to load complaints repository:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [debouncedSearch, filterStatus, page]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32">
      {/* Header filter sticky bank */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-40 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate("dashboard")} className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-900">My Complaints</h1>
        </div>

        {/* Real-time search entry */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Title, ID, or Keywords..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none"
          />
        </div>

        {/* Hot filter tab buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { label: "All", id: "ALL" },
            { label: "Open", id: "OPEN" },
            { label: "Assigned", id: "ASSIGNED" },
            { label: "In Progress", id: "IN_PROGRESS" },
            { label: "Finished", id: "RESOLVED" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterStatus(tab.id);
                setPage(1);
              }}
              className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all", 
                filterStatus === tab.id ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25" : "bg-gray-50 border border-gray-100 text-gray-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
          <span>{totalCount} Reports Listed</span>
          <span className="text-emerald-500 font-sans">Synced Live</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 bg-white border border-gray-100 rounded-[32px] animate-pulse"></div>
            <div className="h-40 bg-white border border-gray-100 rounded-[32px] animate-pulse"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <ShieldCheck size={40} className="text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-bold">No grievances found matching filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => {
              const statusColors: Record<string, string> = {
                OPEN: "orange",
                PENDING: "orange",
                ASSIGNED: "blue",
                IN_PROGRESS: "blue",
                RESOLVED: "emerald",
                CLOSED: "emerald",
                ESCALATED: "red"
              };
              const color = statusColors[c.status] || "gray";

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint(c.id)}
                  className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        'bg-orange-500': color === 'orange',
                        'bg-blue-500': color === 'blue',
                        'bg-emerald-500': color === 'emerald',
                        'bg-red-500': color === 'red',
                      })}></div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {getCategoryLabel(c.category)} • {getSubcategoryLabel(c.subcategory)} • #{c.trackingId}
                      </span>
                    </div>
                    <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider", {
                      'bg-orange-50 text-orange-600': color === 'orange',
                      'bg-blue-50 text-blue-600': color === 'blue',
                      'bg-emerald-50 text-emerald-600': color === 'emerald',
                      'bg-red-50 text-red-600': color === 'red',
                    })}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-gray-900 mb-3">{c.title}</h3>

                  {/* Dynamic AI Insights block */}
                  {c.aiSummary && (
                    <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-3 mb-4">
                      <div className="flex items-center gap-1.5 mb-1 text-emerald-600">
                        <CheckCircle2 size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">AI Categorization Analysis</span>
                      </div>
                      <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed font-semibold">
                        {c.aiSummary}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={12} />
                      <span className="text-[9px] font-bold">
                        {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex gap-2 text-[9px] font-black">
                      <button className="px-3 py-1.5 border border-gray-100 rounded-lg text-gray-600 hover:bg-gray-50">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Pagination footer controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-gray-100 rounded-lg disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-gray-100 rounded-lg disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
