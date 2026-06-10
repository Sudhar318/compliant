import React, { useEffect, useState } from "react";
import { listNotifications, markRead } from "../api/notifications.ts";
import { Bell, ChevronLeft, Check, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "../lib/utils.ts";

interface NotificationsViewProps {
  onGoBack: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onGoBack
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await listNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notification states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await markRead(id);
      // Reload in place
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Could not update badge indices:", err);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onGoBack} className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-900">Alerts & Logs</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse"></div>
            <div className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[32px] border border-gray-150 p-6 text-gray-400">
            <Bell size={36} className="mx-auto text-gray-200 mb-2" />
            <p className="text-xs font-bold font-sans">No alerts or updates found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id, n.read)}
                className={cn(
                  "p-4 rounded-3xl border transition-all cursor-pointer flex gap-4 items-start shadow-sm",
                  n.read
                    ? "bg-white border-gray-100 opacity-70"
                    : "bg-emerald-50/40 border-emerald-100 ring-1 ring-emerald-50/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  n.read ? "bg-gray-50 text-gray-400" : "bg-emerald-100 text-emerald-500"
                )}>
                  {n.read ? <Check size={16} /> : <Bell size={16} className="animate-swing" />}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className={cn("text-xs font-black truncate", n.read ? "text-gray-700" : "text-gray-950")}>
                      {n.title}
                    </h4>
                    <span className="text-[8px] text-gray-400 font-extrabold ml-2 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
