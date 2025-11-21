import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  PlusCircle,
  Bell,
  LogOut,
  User as UserIcon,
  Settings,
  Eye,
  ThumbsUp,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  ShieldCheck,
  Calendar,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area,
  Line,
  CartesianGrid,
} from "recharts";

const API = "/api";

function useAuthHeaders() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  return useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
}

function Badge({ tone = "gray", children }) {
  const tones = {
    gray: "bg-gray-50 text-gray-800 border border-gray-100",
    green: "bg-green-50 text-green-700 border border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-100",
    blue: "bg-blue-50 text-blue-700 border border-blue-100",
    red: "bg-red-50 text-red-700 border border-red-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function statusTone(s) {
  const key = (s || "").toLowerCase();
  if (key === "open") return "yellow";
  if (key === "in progress" || key === "in_review") return "blue";
  if (key === "resolved") return "green";
  if (key === "rejected") return "red";
  if (key === "withdrawn") return "gray";
  return "gray";
}

function Card({ children, className = "" }) {
  return (
    <section className={`bg-white rounded-xl shadow border border-gray-100 p-4 ${className}`}>
      {children}
    </section>
  );
}

/* ---- Professional stat card (identical size) ---- */
function StatCard({ icon: Icon, label, value, tone = "gray" }) {
  const toneAccent = {
    gray: "text-gray-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
    blue: "text-blue-700",
    red: "text-red-700",
  }[tone || "gray"];

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gray-50 border ${tone === 'green' ? 'border-green-100' : tone === 'yellow' ? 'border-yellow-100' : tone === 'blue' ? 'border-blue-100' : 'border-gray-100'}`}>
        <Icon className={`w-6 h-6 ${toneAccent}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneAccent}`}>{value ?? 0}</div>
      </div>
    </div>
  );
}

/* Detail panel (unchanged behavior) */
function DetailPanel({ open, onClose, complaint, loading, onRestore }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-green-600" />
            <div className="font-semibold text-gray-900 truncate">Complaint Details</div>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 py-8">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : !complaint ? (
            <p className="text-sm text-gray-600 text-center py-8">Complaint not found.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900 break-words">{complaint.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <Badge tone={statusTone(complaint.status)}>{complaint.status}</Badge>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                  {complaint.votes > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1 text-yellow-600">
                        <ThumbsUp className="w-3.5 h-3.5" /> {complaint.votes}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{complaint.description || "No description provided."}</p>
              </div>

              {Array.isArray(complaint.attachments) && complaint.attachments.length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h4>
                  <div className="space-y-2">
                    {complaint.attachments.map((a, idx) => (
                      <a key={idx} href={a.url || a} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-green-700 hover:underline">
                        <FileText className="w-4 h-4" />
                        {a.name || a.url || `Attachment ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {String(complaint.status).toLowerCase() === "withdrawn" && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <button onClick={() => onRestore?.(complaint)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                    <RotateCcw className="w-4 h-4" />
                    Restore Complaint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const displayDept = (d) => {
  if (!d) return "Entire organization";
  if (typeof d === "string") return d || "Entire organization";
  return d.name || "Entire organization";
};

/* ---------- ChartCard: Bar chart (consistent width/height) ---------- */
function ChartCard({ summary }) {
  const data = [
    { name: "Open", value: Number(summary.open || 0) },
    { name: "In Progress", value: Number(summary.inProgress || 0) },
    { name: "Resolved", value: Number(summary.resolved || 0) },
    { name: "Total", value: Number(summary.total || 0) },
  ];
  const COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#6B7280"];
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Status Breakdown</h3>
        <div className="text-sm text-gray-500">Counts</div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 6 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Count" isAnimationActive={false}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- DateTrendCard: Area + line (same height as ChartCard) ---------- */
function DateTrendCard({ authHeaders }) {
  const [rangeDays, setRangeDays] = useState(30);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState([]);

  const fetchAndAggregate = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: "mine", limit: "1000", page: "1" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API}/complaints?${params.toString()}`, {
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error(`/api/complaints ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];

      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - (rangeDays - 1));

      const dateMap = {};
      for (let d = 0; d < rangeDays; d++) {
        const dt = new Date(fromDate);
        dt.setDate(fromDate.getDate() + d);
        const key = dt.toISOString().slice(0, 10);
        dateMap[key] = 0;
      }

      for (const it of items) {
        const created = it.createdAt ? new Date(it.createdAt) : null;
        if (!created || isNaN(created.getTime())) continue;
        const key = created.toISOString().slice(0, 10);
        if (key in dateMap) dateMap[key] += 1;
      }

      const arr = Object.keys(dateMap)
        .sort()
        .map((k) => ({ date: k, count: dateMap[k] }));

      setTrendData(arr);
    } catch (e) {
      console.error("[DateTrendCard] fetch error", e);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, rangeDays, statusFilter]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  const areaColor = "#10B981";
  const lineColor = "#059669";

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Complaints Over Time</h3>
          <div className="text-sm text-gray-500">Date-wise</div>
        </div>

        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
            <option value="">All status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>

          <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} className="px-3 py-2 border rounded text-sm">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : trendData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">No data for selected filters.</div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={trendData} margin={{ top: 12, right: 10, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={areaColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke={lineColor} fill="url(#g1)" strokeWidth={2} />
              <Line type="monotone" dataKey="count" stroke={lineColor} strokeWidth={1.5} dot={{ r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">Showing last {rangeDays} days {statusFilter ? `— status: ${statusFilter}` : ""}</div>
    </Card>
  );
}

/* ----------------- Main Component (logic retained) ----------------- */
export default function User_dashboard() {
  const navigate = useNavigate();
  const authHeaders = useAuthHeaders();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [org, setOrg] = useState(null);
  const [orgSlug, setOrgSlug] = useState("");

  const [complaints, setComplaints] = useState([]);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / (limit || 1)));

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [voteBusy, setVoteBusy] = useState({});
  const setVoteBusyFor = (id, v) => setVoteBusy((m) => ({ ...m, [id]: v }));

  const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [actBusy, setActBusy] = useState({});

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      setErr("");
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: "include", headers: { ...authHeaders } });
        if (!res.ok) throw new Error(`auth/me ${res.status}`);
        const data = await res.json();
        setMe(data);

        if (data?.type === "organization") {
          setOrgSlug(data?.profile?.slug || "");
        } else if (data?.type === "user") {
          const directSlug = data?.organization?.slug || data?.organizationSlug || "";
          if (directSlug) {
            setOrgSlug(directSlug);
          } else {
            const orgRes = await fetch(`${API}/my/organizations`, { headers: { ...authHeaders }, credentials: "include" });
            const orgs = await orgRes.json();
            setOrgSlug(Array.isArray(orgs) && orgs.length ? orgs[0].slug : "");
          }
        }
      } catch (e) {
        console.error(e);
        setErr("Failed to load user info");
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!orgSlug) {
      setOrg(null);
      return;
    }
    (async () => {
      setLoadingOrg(true);
      try {
        const res = await fetch(`${API}/organizations/${encodeURIComponent(orgSlug)}`, {
          credentials: "include",
          headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error(`org ${res.status}`);
        const data = await res.json();
        setOrg(data?.organization || null);
      } catch (e) {
        console.error(e);
        setOrg(null);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [orgSlug, authHeaders]);

  const loadComplaints = useCallback(async () => {
    setLoadingComplaints(true);
    try {
      const params = new URLSearchParams({
        scope: "mine",
        limit: String(limit),
        page: String(page),
      });
      if (q) params.set("q", q);
      if (status) params.set("status", status);

      const res = await fetch(`${API}/complaints?${params.toString()}`, {
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error(`/api/complaints ${res.status}`);
      const data = await res.json();

      const items = Array.isArray(data?.items)
        ? data.items.map((it) => ({
            ...it,
            votes: typeof it.votes === "number" ? it.votes : 0,
            liked: !!it.liked,
          }))
        : [];

      setComplaints(items);
      setTotalCount(Number(data?.total || 0));
    } catch (e) {
      console.error(e);
      setComplaints([]);
      setTotalCount(0);
    } finally {
      setLoadingComplaints(false);
    }
  }, [authHeaders, q, status, page, limit]);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const fetchTotal = async (statusValue) => {
        const p = new URLSearchParams({ scope: "mine", limit: "1", page: "1" });
        if (statusValue) p.set("status", statusValue);
        const r = await fetch(`${API}/complaints?${p.toString()}`, {
          credentials: "include",
          headers: { ...authHeaders },
        });
        if (!r.ok) return 0;
        const j = await r.json();
        return Number(j?.total || 0);
      };

      const [total, open, inProg, resolved] = await Promise.all([
        fetchTotal(null),
        fetchTotal("Open"),
        fetchTotal("In Progress"),
        fetchTotal("Resolved"),
      ]);

      setSummary({ total, open, inProgress: inProg, resolved });
    } catch (e) {
      console.error(e);
      setSummary({ total: 0, open: 0, inProgress: 0, resolved: 0 });
    } finally {
      setLoadingSummary(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  const handleLogout = () => {
    try { localStorage.removeItem("token"); } catch {}
    navigate("/Landing_page", { replace: true });
  };

  const openDetail = async (c) => {
    setSelectedComplaint(null);
    setSelectedId(c.id);
    setDetailOpen(true);

    if (c.description && typeof c.description === "string" && c.description.length > 0) {
      setSelectedComplaint(c);
      return;
    }

    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/complaints/${encodeURIComponent(c.id)}`, {
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error(`complaint detail ${res.status}`);
      const data = await res.json();

      const raw = data?.complaint || data || {};
      const normalized = {
        ...c,
        ...raw,
        attachments: Array.isArray(raw.attachments)
          ? raw.attachments
          : raw.attachmentUrl
          ? [{ url: raw.attachmentUrl }]
          : [],
      };
      setSelectedComplaint(normalized);
    } catch (e) {
      console.error(e);
      setSelectedComplaint(c);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVote = async (c) => {
    if (voteBusy[c.id]) return;
    setVoteBusyFor(c.id, true);

    const wasLiked = c.liked;
    const delta = wasLiked ? -1 : 1;
    const prevComplaints = complaints;

    setComplaints(prev => prev.map(it =>
      it.id === c.id ? { ...it, votes: it.votes + delta, liked: !wasLiked } : it
    ));

    try {
      const res = await fetch(`${API}/complaints/${encodeURIComponent(c.id)}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({})
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok) throw new Error(data.message || "Vote failed");

      setComplaints(prev => prev.map(it =>
        it.id === c.id ? { ...it, votes: data.votes, liked: data.liked } : it
      ));

      if (selectedComplaint?.id === c.id) {
        setSelectedComplaint(p => ({ ...p, votes: data.votes, liked: data.liked }));
      }

    } catch (err) {
      alert(err.message || "Failed to update vote");
      setComplaints(prevComplaints);
    } finally {
      setVoteBusyFor(c.id, false);
    }
  };

  const withdrawComplaint = async (c) => {
    if (actBusy[c.id]) return;
    setActBusy((m) => ({ ...m, [c.id]: true }));
    try {
      const res = await fetch(`${API}/complaints/${encodeURIComponent(c.id)}/withdraw`, {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders },
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      await Promise.all([loadComplaints(), loadSummary()]);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to withdraw.");
    } finally {
      setActBusy((m) => ({ ...m, [c.id]: false }));
    }
  };

  const restoreComplaint = async (c) => {
    if (actBusy[c.id]) return;
    setActBusy((m) => ({ ...m, [c.id]: true }));
    try {
      const res = await fetch(`${API}/complaints/${encodeURIComponent(c.id)}/restore`, {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders },
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setDetailOpen(false);
      await Promise.all([loadComplaints(), loadSummary()]);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to restore.");
    } finally {
      setActBusy((m) => ({ ...m, [c.id]: false }));
    }
  };

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium">
            {err}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-green-700 tracking-wide flex items-center gap-2">
                <ShieldCheck size={26} />
                Public Allegation Portal
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/user/complaints/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm text-sm font-medium transition-colors">
                <PlusCircle className="w-4 h-4" />
                File Complaint
              </Link>

              <Link to="/user/notifications" className="relative p-2.5 rounded-lg hover:bg-green-50 transition-colors" aria-label="Notifications" title="Notifications">
                <Bell className="w-5 h-5 text-green-700" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-600" />
              </Link>

              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-green-700" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-2 z-20 border border-gray-100">
                      <Link to="/user/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <UserIcon className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link to="/user/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <div className="h-px bg-gray-100 my-2" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {me?.profile?.name || "User"}!</h1>
          <p className="text-green-50 text-sm sm:text-base">Track your complaints, upvote others, and stay updated with your organization.</p>
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/user/complaints/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">File New Complaint</div>
                <div className="text-xs text-gray-600">Submit a new issue</div>
              </div>
            </Link>

            <Link to="/user/complaints" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">View All Complaints</div>
                <div className="text-xs text-gray-600">See your history</div>
              </div>
            </Link>

            <Link to="/user/profile" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Update Profile</div>
                <div className="text-xs text-gray-600">Manage your info</div>
              </div>
            </Link>
          </div>
        </Card>

        {/* Professional stat cards in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Total Complaints" value={summary.total} tone="gray" />
          <StatCard icon={AlertTriangle} label="Open" value={summary.open} tone="yellow" />
          <StatCard icon={Clock} label="In Progress" value={summary.inProgress} tone="blue" />
          <StatCard icon={CheckCircle} label="Resolved" value={summary.resolved} tone="green" />
        </div>

        {/* Charts row: both cards same height & professional spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard summary={summary} />
          <DateTrendCard authHeaders={authHeaders} />
        </div>

        {/* Recent Complaints */}
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <FileText className="w-6 h-6 text-green-600" />
                Recent Complaints
              </h2>

              <Link to="/user/complaints" className="inline-flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg font-semibold text-sm">
                View All Complaints
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search complaints..." className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" />
              </div>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none">
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Title</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Submitted</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingComplaints ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td colSpan={6} className="px-4 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-4 bg-gray-200 rounded w-8 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : complaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No complaints found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or file a new complaint</p>
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c, i) => {
                      const isWithdrawn = String(c.status).toLowerCase() === "withdrawn";
                      return (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3.5 text-gray-600 font-medium">{(page - 1) * limit + i + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-gray-900 max-w-xs truncate">{c.title}</div>
                            {c.trackingCode && <div className="text-xs text-gray-500 mt-0.5 font-mono">{c.trackingCode}</div>}
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">{displayDept(c.department)}</td>
                          <td className="px-4 py-3.5"><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                          <td className="px-4 py-3.5 text-gray-600">
                            <div className="flex items-center gap-1.5 whitespace-nowrap"><Calendar className="w-3.5 h-3.5 text-gray-400" />{fmtDate(c.createdAt)}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button onClick={() => openDetail(c)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>

                              {!isWithdrawn ? (
                                <button onClick={() => withdrawComplaint(c)} disabled={!!actBusy[c.id]} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs">
                                  {actBusy[c.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Withdraw
                                </button>
                              ) : (
                                <button onClick={() => restoreComplaint(c)} disabled={!!actBusy[c.id]} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">
                                  {actBusy[c.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div className="text-sm text-gray-600 font-medium">
                Showing {complaints.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} complaints
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50">
                  Previous
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50">
                  Next
                </button>
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded text-sm">
                  {[5,10,20,50].map(n => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <DetailPanel open={detailOpen} onClose={() => setDetailOpen(false)} complaint={selectedComplaint} loading={detailLoading} onRestore={restoreComplaint} />
    </div>
  );
}
