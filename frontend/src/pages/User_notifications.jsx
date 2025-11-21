// frontend/src/pages/User_notifications.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Trash2,
  CheckCheck,
  Loader2,
  Calendar,
  Building2
} from "lucide-react";

const API = "/api";

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function NotificationIcon({ type }) {
  const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
  
  switch (type) {
    case "status_changed":
      return <AlertCircle {...iconProps} className="w-5 h-5 text-blue-600" />;
    case "new_complaint":
      return <FileText {...iconProps} className="w-5 h-5 text-green-600" />;
    case "complaint_deleted":
      return <Trash2 {...iconProps} className="w-5 h-5 text-red-600" />;
    case "complaint_withdrawn":
      return <Clock {...iconProps} className="w-5 h-5 text-yellow-600" />;
    case "complaint_restored":
      return <CheckCircle {...iconProps} className="w-5 h-5 text-green-600" />;
    default:
      return <Bell {...iconProps} className="w-5 h-5 text-gray-600" />;
  }
}

function getNotificationColor(type, isRead) {
  if (isRead) return "bg-gray-50 border-gray-200";
  
  switch (type) {
    case "status_changed":
      return "bg-blue-50 border-blue-200";
    case "new_complaint":
      return "bg-green-50 border-green-200";
    case "complaint_deleted":
      return "bg-red-50 border-red-200";
    case "complaint_withdrawn":
      return "bg-yellow-50 border-yellow-200";
    case "complaint_restored":
      return "bg-green-50 border-green-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function User_notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingRead, setMarkingRead] = useState({});
  const [filter, setFilter] = useState("all"); // all, unread, read
  const token = getToken();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/notifications/user`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      
      if (!res.ok) throw new Error("Failed to fetch notifications");
      
      const data = await res.json();
      setNotifs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    setMarkingRead(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API}/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      
      if (!res.ok) throw new Error("Failed to mark as read");
      
      setNotifs(prev => prev.map(n => 
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setMarkingRead(prev => ({ ...prev, [id]: false }));
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifs.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(
        unreadIds.map(id => 
          fetch(`${API}/notifications/${id}/read`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include"
          })
        )
      );
      
      setNotifs(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const filteredNotifs = notifs.filter(n => {
    if (filter === "unread") return !n.read_at;
    if (filter === "read") return n.read_at;
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadNotifications}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/user/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-green-600" />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6 flex gap-1">
          {[
            { key: "all", label: "All", count: notifs.length },
            { key: "unread", label: "Unread", count: unreadCount },
            { key: "read", label: "Read", count: notifs.length - unreadCount }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mark all read on mobile */}
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="sm:hidden w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}

        {/* Notifications List */}
        {filteredNotifs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </h3>
            <p className="text-sm text-gray-600">
              {filter === "unread" 
                ? "You're all caught up! Check back later for updates."
                : "When you receive notifications, they'll appear here."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map(n => (
              <div
                key={n.id}
                className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                  getNotificationColor(n.type, n.read_at)
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 p-2.5 rounded-lg ${
                    n.read_at ? "bg-gray-100" : "bg-white shadow-sm"
                  }`}>
                    <NotificationIcon type={n.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${
                      n.read_at ? "text-gray-600" : "text-gray-900 font-medium"
                    }`}>
                      {n.message}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeAgo(n.createdAt)}
                      </span>
                      
                      {n.org_id && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            Organization Update
                          </span>
                        </>
                      )}

                      {n.read_at && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Read
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!n.read_at && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={markingRead[n.id]}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {markingRead[n.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Mark read"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More (if pagination needed) */}
        {filteredNotifs.length >= 20 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all border border-gray-200">
              Load more notifications
            </button>
          </div>
        )}
      </main>
    </div>
  );
}