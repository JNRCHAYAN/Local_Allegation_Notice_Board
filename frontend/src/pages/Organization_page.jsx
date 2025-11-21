// new organication page with a slight different ui................wanna seek the old one go to random.txt
// src/pages/Organization_page.jsx 

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Loader2,
  Search,
  Building2,
  User,
  LogOut,
  Eye,
  Trash2,
  FileText,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ThumbsUp,
  ArrowUp,
  Plus,
  X,
  Folder,
  Edit2,
  Calendar,
  Bell,
  ShieldCheck, // ✅ ADD THIS LINE
  LogIn,
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
    gray: "bg-gray-100 text-gray-700 border border-gray-200",
    green: "bg-green-50 text-green-700 border border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function statusTone(s) {
  const key = (s || "").toLowerCase().replace(" ", "_");
  if (key === "resolved" || key === "closed") return "green";
  if (key === "in_progress" || key === "pending") return "blue";
  if (key === "rejected") return "red";
  return "gray";
}

function Card({ children, className = "" }) {
  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </section>
  );
}

function StatPill({ icon: Icon, label, value, tone = "green" }) {
  const tones = {
    green: "text-green-600 bg-green-50 border-green-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    red: "text-red-600 bg-red-50 border-red-200",
    gray: "text-gray-600 bg-gray-50 border-gray-200",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${tones[tone]} transition-all hover:shadow-sm`}>
      <div className={`p-2 rounded-lg ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className={`text-2xl font-bold ${tones[tone].split(' ')[0]}`}>{value ?? 0}</div>
        <div className="text-sm text-gray-600 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ---------- Chart components (visual-only) ----------

function ChartCard({ complaints }) {
  // derive counts by status
  const counts = complaints.reduce(
    (acc, c) => {
      const k = (c.status || "unknown").toLowerCase();
      if (k.includes("open")) acc.open++;
      else if (k.includes("in progress") || k.includes("in_progress") || k.includes("inprogress")) acc.inProgress++;
      else if (k.includes("resolved") || k.includes("closed")) acc.resolved++;
      else if (k.includes("rejected")) acc.rejected++;
      else acc.other++;
      acc.total++;
      return acc;
    },
    { open: 0, inProgress: 0, resolved: 0, rejected: 0, other: 0, total: 0 }
  );

  const data = [
    { name: "Open", value: counts.open },
    { name: "In Progress", value: counts.inProgress },
    { name: "Resolved", value: counts.resolved },
    { name: "Total", value: counts.total },
  ];

  const COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#6B7280"];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Status Breakdown</h3>
          <div className="text-sm text-gray-500">Counts by status</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Count" isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DateTrendCard({ complaints }) {
  const [rangeDays, setRangeDays] = useState(30);
  const [statusFilter, setStatusFilter] = useState("");
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);

  // derive from complaints prop (no extra fetch - visual only)
  useEffect(() => {
    setLoading(true);
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - (rangeDays - 1));

      // initialize map
      const dateMap = {};
      for (let d = 0; d < rangeDays; d++) {
        const dt = new Date(fromDate);
        dt.setDate(fromDate.getDate() + d);
        const key = dt.toISOString().slice(0, 10);
        dateMap[key] = 0;
      }

      for (const it of complaints) {
        if (!it || !it.createdAt) continue;
        if (statusFilter && String(it.status).toLowerCase() !== statusFilter.toLowerCase()) continue;
        const created = new Date(it.createdAt);
        if (isNaN(created.getTime())) continue;
        const key = created.toISOString().slice(0, 10);
        if (key in dateMap) dateMap[key] += 1;
      }

      const arr = Object.keys(dateMap)
        .sort()
        .map((k) => ({ date: k, count: dateMap[k] }));

      setTrendData(arr);
    } catch (e) {
      console.error("[DateTrendCard] compute error", e);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, [complaints, rangeDays, statusFilter]);

  const areaColor = "#10B981";
  const lineColor = "#059669";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Complaints Over Time</h3>
          <div className="text-sm text-gray-500">Date-wise</div>
        </div>

        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
            <option value="">All status</option>
            <option value="Pending">Pending</option>
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

      <div style={{ width: "100%", height: 260 }}>
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
                <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={areaColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke={lineColor} fill="url(#g2)" strokeWidth={2} />
              <Line type="monotone" dataKey="count" stroke={lineColor} strokeWidth={1.5} dot={{ r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">Showing last {rangeDays} days {statusFilter ? `— status: ${statusFilter}` : ""}</div>
    </div>
  );
}

// Department Modal
function DepartmentModal({ open, onClose, onSubmit, editDept }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editDept) {
      setName(editDept.name || "");
    } else {
      setName("");
    }
  }, [editDept, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim() });
      setName("");
      onClose();
    } catch (err) {
      alert(err.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-green-600" />
            {editDept ? "Edit Department" : "Create Department"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Water Supply, Electricity, Health"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              required
              minLength={3}
            />
            <p className="mt-1.5 text-xs text-gray-500">Minimum 3 characters required</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className={`px-4 py-2.5 rounded-lg text-white font-medium inline-flex items-center gap-2 transition-all ${
                name.trim() && !submitting ? "bg-green-600 hover:bg-green-700 shadow-sm" : "bg-green-300 cursor-not-allowed"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editDept ? "Save Changes" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Detail Panel
function DetailPanel({ open, onClose, complaint, loading, onUpdateStatus, onDelete, onVote, isManager }) {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(complaint?.status || "");

  useEffect(() => {
    if (complaint?.status) setLocalStatus(complaint.status);
  }, [complaint?.status]);

  if (!open) return null;

  const handleUpdateStatus = async (newStatus) => {
    if (!complaint || !isManager || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await onUpdateStatus?.(complaint.id, newStatus);
      setLocalStatus(newStatus);
    } catch (e) {
      console.error("Failed to update status:", e);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] flex flex-col animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="font-semibold text-gray-900 truncate">Complaint Details</div>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" aria-label="Close" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 py-8">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : !complaint ? (
            <p className="text-sm text-gray-600 text-center py-8">Complaint not found.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 break-words">{complaint.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <Badge tone={statusTone(localStatus)}>{localStatus}</Badge>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                  
                  {/* ✅ EDITED BADGE - Shows if complaint was modified */}
                  {complaint.editedAt && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium flex items-center gap-1">
                        <Edit2 className="w-3 h-3" />
                        Edited
                      </span>
                    </>
                  )}
                  {complaint.votes > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1 text-yellow-600 font-medium">
                        <ThumbsUp className="w-3.5 h-3.5" /> {complaint.votes}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                  {complaint.description || "No description provided."}
                </p>
              </div>

              {complaint.document && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachment</h4>
                  {complaint.document.endsWith(".pdf") ? (
                    <a href={complaint.document} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium hover:underline">
                      <FileText className="w-4 h-4" /> View PDF Document
                    </a>
                  ) : (
                    <img src={complaint.document} alt="Attachment" className="max-w-full rounded-lg shadow-sm border border-green-200" />
                  )}
                </div>
              )}

              {isManager && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Pending", "In Progress", "Resolved", "Rejected"].map((s) => {
                      const active = localStatus === s;
                      return (
                        <button
                          key={s}
                          disabled={statusUpdating || active}
                          onClick={() => handleUpdateStatus(s)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                            active
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "bg-white hover:bg-green-50 border-gray-300 text-gray-700"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin inline" /> : s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => onVote(complaint.id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium transition-all active:scale-95 shadow-sm"
                >
                  <ArrowUp className="w-4 h-4" />
                  Upvote ({complaint.votes || 0})
                </button>  
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function Organization_page() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const authHeaders = useAuthHeaders();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [org, setOrg] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("complaints");

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortByVotes, setSortByVotes] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [fileComplaintMenuOpen, setFileComplaintMenuOpen] = useState(false);

  const isLoggedIn = !!authHeaders.Authorization;
  const showLogin = !isLoggedIn && location.pathname.startsWith("/organization/");

  // --- RESTORE TAB ON BACK NAVIGATION ---
  useEffect(() => {
    const tab = location.state?.activeTab;
    if (tab && ["complaints", "departments", "members"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.state]);

  // Generate anonId for anonymous voting
  useEffect(() => {
    if (!localStorage.getItem("anonId")) {
      localStorage.setItem("anonId", Math.random().toString(36).substring(2, 15));
    }
  }, []);

  // Fetch org + complaints + members + departments
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API}/organizations/${encodeURIComponent(slug)}/complaints`, {
          headers: { ...authHeaders }
        });

        if (res.status === 403) {
          setErr("This organization is private. Please log in.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!res.ok || data?.success === false) throw new Error(data?.message || `HTTP ${res.status}`);

        if (!isMounted) return;
        setOrg(data.organization || null);
        
        setComplaints(Array.isArray(data.complaints) ? data.complaints : []);

        // Fetch members if org admin
        if (data.organization?.myRole === "org_admin") {
          const memRes = await fetch(`${API}/organizations/${slug}/members`, { headers: authHeaders });
          if (memRes.ok) {
            const memData = await memRes.json();
            setMembers(memData.members || []);
          }

          // Fetch departments
          const deptRes = await fetch(`${API}/organizations/${slug}/departments`, { headers: authHeaders });
          if (deptRes.ok) {
            const deptData = await deptRes.json();
            setDepartments(Array.isArray(deptData.items) ? deptData.items : []);
          }
        }
      } catch (e) {
        if (!isMounted) return;
        setErr(e?.message || "Failed to load organization");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [slug, authHeaders]);

  const isManager = useMemo(() => {
    return (org?.myRole || "").toLowerCase() === "org_admin";
  }, [org]);

  const filtered = useMemo(() => {
    const qx = q.toLowerCase();
    return complaints.filter((c) => {
      const okStatus = status === "all" || c.status === status;
      const inText = !qx || c.title.toLowerCase().includes(qx) || c.description.toLowerCase().includes(qx) || (c.trackingCode || "").includes(qx);
      return okStatus && inText;
    });
  }, [complaints, q, status]);

  const sortedComplaints = useMemo(() => {
    const list = [...filtered];
    if (sortByVotes) {
      list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    }
    return list;
  }, [filtered, sortByVotes]);

  const totalPages = Math.max(1, Math.ceil(sortedComplaints.length / limit));
  const pageData = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedComplaints.slice(start, start + limit);
  }, [sortedComplaints, page, limit]);

  useEffect(() => { setPage(1); }, [q, status, limit, sortByVotes]);

  const counts = useMemo(() => {
    const byStatus = complaints.reduce((acc, c) => {
      const k = c.status.toLowerCase().replace(" ", "_");
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return { 
      total: complaints.length, 
      pending: byStatus.pending || 0,
      in_progress: byStatus.in_progress || 0,
      resolved: byStatus.resolved || 0,
      rejected: byStatus.rejected || 0,
    };
  }, [complaints]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/Landing_page", { replace: true });
  };

  const viewComplaint = (c) => {
    setSelectedComplaint(c);
    setDetailOpen(true);
  };

  const voteComplaint = async (id) => {
    try {
      let anonId = localStorage.getItem("anonId");
      if (!anonId) {
        anonId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("anonId", anonId);
      }

      const headers = { "Content-Type": "application/json" };

      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      } else if (anonId) {
        headers["X-Anon-ID"] = anonId;
      }

      const res = await fetch(`${API}/complaints/${id}/vote`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Vote failed:", err);
        alert("Vote failed. Try again.");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setComplaints(prev =>
          prev.map(c => c.id === id ? { ...c, votes: data.votes } : c)
        );
        if (selectedComplaint?.id === id) {
          setSelectedComplaint(prev => prev ? { ...prev, votes: data.votes } : null);
        }
      }
    } catch (e) {
      console.error("Vote error:", e);
      alert("Network error. Check console.");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, votes: data.votes } : c));
      if (selectedComplaint?.id === id) {
        setSelectedComplaint(prev => prev ? { ...prev, status: newStatus, votes: data.votes } : null);
      }
    } catch (e) {
      alert("Failed to update status");
      throw e;
    }
  };


  // this deletion should not be allowed...... organization can only reject but not delete it , this POWER is only given to the user, only they can withdraw their complaint if they want
  // const deleteComplaint = async (id) => {
  //   if (!window.confirm("Delete this complaint permanently? This cannot be undone.")) return;

  //   try {
  //     const res = await fetch(`/api/complaints/${id}`, {
  //       method: "DELETE",
  //       headers: authHeaders
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(data.message || `HTTP ${res.status}`);
  //     }

  //     setComplaints(prev => prev.filter(c => c.id !== id));
  //     if (selectedComplaint?.id === id) {
  //       setDetailOpen(false);
  //       setSelectedComplaint(null);
  //     }

  //     alert("Complaint deleted successfully.");

  //   } catch (err) {
  //     console.error("Delete failed:", err);
  //     alert(`Failed to delete: ${err.message}`);
  //   }
  // };

  const handleCreateDepartment = async (formData) => {
    try {
      const res = await fetch(`${API}/organizations/${slug}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create department");
      }

      // Refresh departments list
      const deptRes = await fetch(`${API}/organizations/${slug}/departments`, { headers: authHeaders });
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData.items) ? deptData.items : []);
      }

      alert("Department created successfully!");
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm("Delete this department? Complaints under it will remain but won't be associated with this department.")) return;

    try {
      const res = await fetch(`${API}/organizations/${slug}/departments/${deptId}`, {
        method: "DELETE",
        headers: authHeaders
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete department");
      }

      setDepartments(prev => prev.filter(d => d.id !== deptId));
      alert("Department deleted successfully!");
    } catch (err) {
      alert(err.message || "Failed to delete department");
    }
  };

  const handleBanUser = async (userId, email, name) => { //delete is better than ban , same thing...
    if (!window.confirm(`Permanently delete ${name} (${email})?`)) return;
    try {
      const res = await fetch(`${API}/organizations/${slug}/members/${userId}/ban`, {
        method: "POST",
        headers: { ...authHeaders }
      });
      const data = await res.json();
      if (data.success) {
        setMembers(prev => prev.filter(m => m.id !== userId));
        alert("User deleted.");
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (e) { 
      alert("Network error"); 
    }
  };

  // Helper function for tab button styling
  const tabBtn = (t) => `px-5 py-3 text-sm font-semibold transition-all ${
    activeTab === t 
      ? "text-green-600 border-b-2 border-green-600" 
      : "text-gray-600 hover:text-gray-900"
  }`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" /> 
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </div>
    );
  }
//=================================================
// Private Organization View
//==================================================
  if (err && err === "This organization is private. Please log in.") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        {/* Navbar with Logo */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <h1 className="text-2xl font-bold text-green-700 tracking-wide flex items-center gap-2">
                <ShieldCheck size={28} />
                Public Allegation Portal
              </h1>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                {showLogin ? (
                  <>
                    <Link
                      to="/login"
                      state={{ from: `/organization/${slug}` }}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                    >
                      <LogIn className="w-4 h-4 inline mr-2" />
                      Login
                    </Link>
                    <Link
                      to="/register"
                      state={{ from: `/organization/${slug}` }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm"
                    >
                      Register
                    </Link>
                  </>
                ) : (
                  <button onClick={handleLogout} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Private Organization Card */}
        <main className="mx-auto max-w-2xl px-6 py-20">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Icon Header */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-lg ring-4 ring-white">
                <Building2 className="w-10 h-10 text-white" strokeWidth={2} />
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Private Organization
                </h2>
                <p className="text-gray-600">
                  This organization's complaints are only visible to registered members.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You need to be a member of this organization to view its content.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                {!isLoggedIn ? (
                  <>
                    <Link
                      to="/login"
                      state={{ from: `/organization/${slug}` }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all shadow-sm"
                    >
                      <LogIn className="w-5 h-5" />
                      Login to Access
                    </Link>
                    <Link
                      to="/register"
                      state={{ from: `/organization/${slug}` }} 
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-semibold transition-all"
                    >
                      Register Account
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/user/dashboard"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all shadow-sm"
                    >
                      <User className="w-5 h-5" />
                      Go to Dashboard
                    </Link>
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                    >
                      <Building2 className="w-5 h-5" />
                      Browse Organizations
                    </Link>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Contact the organization administrator if you believe you should have access
                </p>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              How to Get Access
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Step 1:</strong> Register an account if you don't have one</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Step 2:</strong> Contact your organization administrator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Step 3:</strong> Get added as a member to view complaints</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    );
  }

  if (err || !org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium">
            {err || "Organization not found."}
          </div>
        </div>
      </div>
    );
  }
//=============================================================
// organization page of the public and private after login 
//============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <h1 className="text-2xl font-bold text-green-700 tracking-wide flex items-center gap-2">
                <ShieldCheck size={28} />
                Public Allegation Portal
              </h1>
            </div>



            <div className="flex items-center gap-3">
              {/* Show File Complaint button ONLY if user is NOT the org admin */}
              {!isManager && (
                <div className="relative">
                  <button
                    onClick={() => setFileComplaintMenuOpen(!fileComplaintMenuOpen)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    File Complaint
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {fileComplaintMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setFileComplaintMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-2 z-20 border border-gray-100">
                        {isLoggedIn ? (
                          <>
                            <Link
                              to="/user/complaints/new"
                              state={{ organizationSlug: slug }}
                              onClick={() => setFileComplaintMenuOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 font-medium transition-colors"
                            >
                              <FileText className="w-4 h-4 text-green-600" />
                              <div>
                                <div className="font-semibold text-gray-900">File Complaint</div>
                                <div className="text-xs text-gray-500">Submit as member</div>
                              </div>
                            </Link>
                            <div className="h-px bg-gray-100 my-1" />
                            <Link
                              to="/anonymous_complaint"
                              state={{ organizationSlug: slug }}
                              onClick={() => setFileComplaintMenuOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                              <User className="w-4 h-4 text-gray-600" />
                              <div>
                                <div className="font-semibold text-gray-900">File Anonymously</div>
                                <div className="text-xs text-gray-500">Hide your identity</div>
                              </div>
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/login"
                              state={{ from: `/organization/${slug}`, action: 'file-complaint' }}
                              onClick={() => setFileComplaintMenuOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 font-medium transition-colors"
                            >
                              <LogIn className="w-4 h-4 text-green-600" />
                              <div>
                                <div className="font-semibold text-gray-900">Login to File</div>
                                <div className="text-xs text-gray-500">Sign in to your account</div>
                              </div>
                            </Link>
                            <div className="h-px bg-gray-100 my-1" />
                            <Link
                              to="/anonymous_complaint"
                              state={{ organizationSlug: slug }}
                              onClick={() => setFileComplaintMenuOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                              <User className="w-4 h-4 text-gray-600" />
                              <div>
                                <div className="font-semibold text-gray-900">File Anonymously</div>
                                <div className="text-xs text-gray-500">No account needed</div>
                              </div>
                            </Link>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Notification bell (org only) */}
              {isManager && (
                <Link
                  to="/organization/notifications"
                  className="relative p-2.5 rounded-lg hover:bg-green-50 transition-colors"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-green-700" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-600" />
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-green-700" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-2 z-20 border border-gray-100">
                      {isManager ? (
                        <>
                          <button
                            onClick={() => {
                              navigate("/organization/profile");
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            Profile
                          </button>
                          <button
                            onClick={() => {
                              navigate("/organization/settings");
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                          >
                            <Folder className="w-4 h-4" />
                            Settings
                          </button>
                          <div className="h-px bg-gray-100 my-2" />
                        </>
                      ) : isLoggedIn ? (
                        <>
                          <Link
                            to="/user/dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            My Dashboard
                          </Link>
                          <div className="h-px bg-gray-100 my-2" />
                        </>
                      ) : null}

                      {showLogin ? (
                        <Link
                          to="/login"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 font-medium"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LogIn className="w-4 h-4" /> Login
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            handleLogout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 border-t border-gray-200">
          <div className="flex gap-1 overflow-x-auto justify-center">
            <button onClick={() => setActiveTab("complaints")} className={tabBtn("complaints")}>
              Complaints
            </button>
            {isManager && (
              <>
                <button onClick={() => setActiveTab("departments")} className={tabBtn("departments")}>
                  Departments
                </button>
                <button onClick={() => setActiveTab("members")} className={tabBtn("members")}>
                  Members
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Welcome Section */}
        {/* Organization Name Banner - Modern Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-green-100 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                <Building2 className="w-8 h-8 text-green-700" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {org.name}
              </h1>
              {org.address && (
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {org.address}
                </p>
              )}
            </div>
          </div>
        </div>


        {/* Complaints Tab */}
        {activeTab === "complaints" && (

          <Card>

            {/* Stats */}
            <div className="mb-6">
              <div className="rounded-xl bg-white/95 backdrop-blur-lg p-4 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatPill icon={FileText} label="Total Complaints" value={counts.total} tone="gray" />
                  <StatPill icon={Clock} label="In Progress" value={counts.in_progress} tone="blue" />
                  <StatPill icon={CheckCircle} label="Resolved" value={counts.resolved} tone="green" />
                  <StatPill icon={AlertTriangle} label="Pending" value={counts.pending} tone="yellow" />
                </div>
              </div>
            </div>

            {/* New: Charts row (professional & balanced) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ChartCard complaints={complaints} />
              <DateTrendCard complaints={complaints} />
            </div>

            {/* Complaints table */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <FileText className="w-5 h-5 text-green-600" /> All Complaints
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search complaints..."
                    className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all w-64"
                  />
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>


{/* table hereeeeee */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Title</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Status</th>
                    <th 
                      className="px-4 py-3.5 text-left font-semibold text-gray-700 cursor-pointer hover:text-green-600" 
                      onClick={() => setSortByVotes(p => !p)}
                    >
                      Votes {sortByVotes ? "↓" : "↑"}
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Submitted</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No complaints found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    pageData.map((c, i) => (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 text-gray-600 font-medium">{(page - 1) * limit + i + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-900">{c.title}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <span className="text-xs">{c.department || "General"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1.5 text-yellow-600 font-semibold">
                            <ThumbsUp className="w-3.5 h-3.5" /> {c.votes}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button 
                              onClick={() => viewComplaint(c)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium hover:bg-gray-50 transition-all active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {!isManager && (
                              <button 
                                onClick={() => voteComplaint(c.id)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-medium hover:bg-yellow-100 transition-all active:scale-95"
                              >
                                <ArrowUp className="w-3.5 h-3.5" /> {c.votes}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-600 font-medium">
                Showing {pageData.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, sortedComplaints.length)} of {sortedComplaints.length} complaints
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page <= 1} 
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages} 
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Departments Tab */}
        {activeTab === "departments" && isManager && (
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <Folder className="w-5 h-5 text-green-600" /> Departments
              </h2>
              <button
                onClick={() => {
                  setEditingDept(null);
                  setDeptModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Department
              </button>
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Folder className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-900 font-semibold mb-2">No departments yet</p>
                <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                  Create departments to organize complaints by category such as Water Supply, Electricity, or Health
                </p>
                <button
                  onClick={() => {
                    setEditingDept(null);
                    setDeptModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create First Department
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <Link
                    key={dept.id}
                    to={`/organization/${slug}/department/${dept.slug}`}
                    state={{ fromTab: activeTab }}
                    className="group bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-5 hover:shadow-lg hover:border-green-200 transition-all block"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Folder className="w-6 h-6 text-green-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 truncate">{dept.name}</h3>
                          <p className="text-xs text-gray-500 font-mono truncate">{dept.slug}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          e.preventDefault(); 
                          handleDeleteDepartment(dept.id); 
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="pt-3 border-t border-green-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Status</span>
                        <Badge tone={dept.status === 'active' ? 'green' : 'gray'}>{dept.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                How Departments Work
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Users can select departments when filing complaints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Departments help organize and categorize issues effectively</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Common examples: Water Supply, Electricity, Health, Sanitation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Deleting a department won't delete associated complaints</span>
                </li>
              </ul>
            </div>
          </Card>
        )}

        {/* Members Tab */}
        {activeTab === "members" && isManager && (
          <Card>
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5 text-green-600" /> Registered Members
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Joined</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No members yet</p>
                      </td>
                    </tr>
                  ) : (
                    members.map(m => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-gray-900">{m.name}</td>
                        <td className="px-4 py-3.5 text-gray-600">{m.email}</td>
                        <td className="px-4 py-3.5">
                          <Badge tone="blue">{m.role}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(m.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleBanUser(m.id, m.email, m.name)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
                          >
                            Ban
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      <DetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        complaint={selectedComplaint}
        loading={false}
        onUpdateStatus={updateStatus}
        // onDelete={deleteComplaint}
        onVote={voteComplaint}
        isManager={isManager}
      />

      <DepartmentModal
        open={deptModalOpen}
        onClose={() => {
          setDeptModalOpen(false);
          setEditingDept(null);
        }}
        onSubmit={handleCreateDepartment}
        editDept={editingDept}
      />
    </div>
  );
}
