import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, Trash2, Info, AlertTriangle, CheckCircle, Flame } from "lucide-react";
import { notificationsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

class NotificationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("NotificationDropdown Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative">
          <button className="p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm relative group cursor-not-allowed opacity-50">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeFormatDate = (dateVal) => {
  if (!dateVal) return "Just now";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.valueOf())) {
      console.warn("Invalid notification date", dateVal);
      return "Just now";
    }
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    console.warn("Error parsing date", dateVal, e);
    return "Just now";
  }
};

function NotificationDropdownInner() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const [isPending, setIsPending] = useState(false);
  const userId = user?._id || user?.id;

  const normalizeNotifications = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    return data.map((n) => ({
      ...n,
      id: n.id,
      is_read: Boolean(n.is_read),
      created_at: n.created_at || new Date().toISOString(),
    }));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      console.log("[notifications] GET /notifications/", userId);
      const data = await notificationsApi.getNotifications(userId);
      setNotifications(normalizeNotifications(data));
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [userId, normalizeNotifications]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return undefined;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId || isPending) return;

    const prevNotifs = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, is_read: true } : n))
    );
    try {
      console.log("[notifications] PATCH /api/notifications/:id", id, userId);
      const next = await notificationsApi.markAsRead(id, userId);
      if (Array.isArray(next)) setNotifications(normalizeNotifications(next));
    } catch (err) {
      console.error("MarkAsRead Error:", err);
      setNotifications(prevNotifs);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId || unreadCount === 0 || isPending) return;
    
    setIsPending(true);
    const prevNotifs = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    
    try {
      console.log("[notifications] PATCH /api/notifications/read-all", userId);
      const next = await notificationsApi.markAllAsRead(userId);
      if (Array.isArray(next)) setNotifications(normalizeNotifications(next));
    } catch (err) {
      console.error("MarkAllAsRead Error:", err);
      setNotifications(prevNotifs);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId || isPending) return;
    
    setIsPending(true);
    const prevNotifs = [...notifications];
    setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    
    try {
      console.log("[notifications] DELETE /api/notifications/:id", id, userId);
      const next = await notificationsApi.deleteNotification(id, userId);
      if (Array.isArray(next)) setNotifications(normalizeNotifications(next));
    } catch (err) {
      console.error("Delete Error:", err);
      setNotifications(prevNotifs);
    } finally {
      setIsPending(false);
    }
  };

  const handleClearAll = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!userId || isPending) return;
    
    setIsPending(true);
    const prevNotifs = [...notifications];
    setNotifications([]);
    
    try {
      console.log("[notifications] DELETE /api/notifications/all", userId);
      const next = await notificationsApi.clearAll(userId);
      setNotifications(Array.isArray(next) ? normalizeNotifications(next) : []);
    } catch (err) {
      console.error("ClearAll Error:", err);
      setNotifications(prevNotifs);
    } finally {
      setIsPending(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "alert": return <Flame className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-all relative group"
      >
        <Bell className="w-5 h-5 text-gray-500 group-hover:text-cyan-500 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                Notifications
                {unreadCount > 0 && <span className="text-xs font-medium bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || isPending}
                  className={`text-xs font-semibold hover:underline ${unreadCount === 0 || isPending ? 'text-gray-400 cursor-not-allowed' : 'text-cyan-600 hover:text-cyan-700'}`}
                >
                  Mark all read
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <motion.div
                      layout
                      key={`n-${notif.id}`}
                      className={`p-4 hover:bg-gray-50 transition-colors flex gap-4 relative group ${!notif.is_read ? 'bg-cyan-50/30' : ''}`}
                    >
                      <div className="shrink-0 mt-1">
                        {getTypeIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold truncate pr-6 ${notif.is_read ? 'text-gray-900' : 'text-cyan-900'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            {safeFormatDate(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center gap-3">
                            {!notif.is_read && (
                             <button
                               onClick={(e) => handleMarkAsRead(notif.id, e)}
                               className="text-[11px] font-bold text-cyan-600 hover:underline flex items-center gap-1"
                             >
                               <Check className="w-3 h-3" /> Mark Read
                             </button>
                           )}
                           <button
                             disabled={isPending}
                             onClick={(e) => handleDeleteNotification(notif.id, e)}
                             className={`text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isPending ? 'text-gray-400 cursor-not-allowed' : 'text-red-400 hover:text-red-500'}`}
                           >
                             <Trash2 className="w-3 h-3" /> Delete
                           </button>
                        </div>
                      </div>
                      
                      {!notif.is_read && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full" />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
                <button
                  onClick={handleClearAll}
                  disabled={isPending}
                  className={`text-xs font-bold transition-colors flex items-center justify-center gap-2 mx-auto px-4 py-2 hover:bg-red-50 rounded-xl ${isPending ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NotificationDropdown() {
  return (
    <NotificationErrorBoundary>
      <NotificationDropdownInner />
    </NotificationErrorBoundary>
  );
}
