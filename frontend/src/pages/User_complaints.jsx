// frontend/src/pages/User_complaints.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = "/api";

function useAuthHeaders() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  return useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
}

function Badge({ tone = "gray", children }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function statusTone(s) {
  const key = (s || "").toLowerCase();
  if (key === "open") return "yellow";
  if (key === "in progress" || key === "pending") return "blue";
  if (key === "resolved") return "green";
  if (key === "rejected") return "red";
  if (key === "withdrawn") return "gray";
  return "gray";
}

function ComplaintCard({ complaint, onExpand, isExpanded, authHeaders, onUpdate }) {
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "—";
    }
  };

  const handleToggle = async () => {
  if (!isExpanded && !detailData) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/complaints/${complaint.id}`, {
        credentials: "include",
        headers: { ...authHeaders }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      
      // ✅ Handle both wrapped and unwrapped responses
      const complaintData = data?.complaint || data;
      
      if (!complaintData?.id) {
        throw new Error("Invalid response");
      }
      
      setDetailData(complaintData);
      
    } catch (e) {
      console.error("Failed to load details:", e);
      setDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  }
  onExpand();
};


  const handleEditClick = () => {
    setEditTitle(detailData?.title || complaint.title || "");
    setEditDescription(detailData?.description || complaint.description || "");
    setIsEditing(true);
    setEditError("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError("");
  };

const handleSaveEdit = async () => {
  if (!editTitle.trim()) {
    setEditError("Title is required");
    return;
  }

  setSaving(true);
  setEditError("");

  try {
    const res = await fetch(`${API}/complaints/${complaint.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim()
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update complaint");
    }

    const data = await res.json();
    
    // ✅ Handle the new response format
    if (data.success && data.complaint) {
      setDetailData(data.complaint);
      setIsEditing(false);
      
      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 z-[60] p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-lg';
      successMsg.textContent = '✓ Changes saved successfully';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        successMsg.remove();
      }, 2000);
      
      // Close modal and refresh
      onExpand();
      if (onUpdate) {
        onUpdate();
      }
    } else {
      throw new Error("Invalid response format");
    }
  } catch (e) {
    console.error(e);
    setEditError(e.message || "Failed to save changes");
  } finally {
    setSaving(false);
  }
};

  return (
    <>
      {/* Card Preview - Always visible */}
      <div className="rounded-xl bg-white shadow ring-1 ring-gray-100 overflow-hidden transition-all">
        <div 
          onClick={handleToggle}
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <Badge tone={statusTone(complaint.status)}>
              {complaint.status}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDate(complaint.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {complaint.title}
          </h3>

          {/* Department */}
          <div className="text-xs text-gray-600 mb-2">
            📁 {complaint.department?.name || complaint.organization || "Entire organization"}
          </div>

          {/* Tracking Code */}
          {complaint.trackingCode && (
            <div className="text-xs text-gray-500 font-mono">
              #{complaint.trackingCode}
            </div>
          )}

          {/* Expand indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-green-700 font-medium">
              View Details
            </span>
            <svg 
              className="w-4 h-4 text-green-700"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Details - Overlay Modal */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          onClick={handleToggle}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end p-3">
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-5 space-y-4">
              {loadingDetail ? (
                <div className="text-center text-gray-600 py-6">
                  Loading details...
                </div>
              ) : detailData ? (
                <>
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                          placeholder="Complaint title"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                          placeholder="Describe your complaint..."
                        />
                      </div>

                      {editError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                          {editError}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      {/* Title */}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {detailData.title || complaint.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Description</h4>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {detailData.description || complaint.description || "No description provided."}
                        </p>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">Priority</div>
                          <div className="text-sm font-medium text-gray-900">
                            {detailData.priority || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Created</div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDateTime(detailData.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Department</div>
                          <div className="text-sm font-medium text-gray-900">
                            {detailData.department?.name || "Entire org"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Votes</div>
                          <div className="text-sm font-medium text-gray-900">
                            👍 {detailData.votes || 0}
                          </div>
                        </div>
                      </div>

                      {/* Attachments */}
                      {(detailData.attachmentUrl || detailData.document) && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Attachment</h4>
                          <a 
                            href={detailData.attachmentUrl || detailData.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 underline"
                          >
                            📎 View Attachment
                          </a>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Link
                          to={`/user/complaints/${complaint.id}`}
                          className="px-3 py-1.5 text-sm rounded-lg border border-green-600 text-green-600 hover:bg-green-50"
                        >
                          Full Details
                        </Link>
                        {complaint.status !== "Withdrawn" && complaint.status !== "Resolved" && (
                          <button
                            onClick={handleEditClick}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) 
              : (
                <div className="text-sm text-gray-600 text-center py-6">
                  Failed to load details. Please try again.
                 
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function User_complaints() {
  const authHeaders = useAuthHeaders();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  useEffect(() => {
    loadComplaints();
  }, [page, limit, statusFilter]);

  const loadComplaints = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        scope: "mine",
        limit: String(limit),
        page: String(page),
      });
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`${API}/complaints?${params.toString()}`, {
        credentials: "include",
        headers: { ...authHeaders },
      });

      if (!res.ok) throw new Error("Failed to load complaints");

      const data = await res.json();
      setComplaints(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.total || 0));
    } catch (e) {
      console.error(e);
      setError("Failed to load complaints");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadComplaints();
  };

  const handleComplaintUpdate = () => {
    loadComplaints();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/user/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-green-700">My Complaints</h1>
        </div>
        <Link
          to="/user/complaints/new"
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition-colors"
        >
          + New Complaint
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-gray-100 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search complaints..."
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-100 animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-200 rounded mb-3" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow ring-1 ring-gray-100 text-center">
          <p className="text-gray-600 mb-3">No complaints found.</p>
          <Link to="/user/complaints/new" className="text-green-700 underline">
            File your first complaint
          </Link>
        </div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                isExpanded={expandedId === complaint.id}
                onExpand={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                authHeaders={authHeaders}
                onUpdate={handleComplaintUpdate}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}