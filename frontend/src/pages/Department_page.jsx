// src/pages/Department_page.jsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  FileText,
  Calendar,
  Eye,
  ArrowUp,
  X,
} from "lucide-react";
import { getToken } from "../utils/auth";

const API = "/api";

export default function Department_page() {
  // --- Hooks ---
  const { slug, deptSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [dept, setDept] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

    // --- Where did we come from? ---
    const cameFromTab = location.state?.fromTab || "departments";

    // --- Go back to organization + restore tab ---
    const goBack = () => {
    navigate(`/organization/${slug}`, {   // ← FIXED: removed /departments/
        state: { activeTab: cameFromTab },
    });
    };
  // --- Fetch department + complaints ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dRes, cRes] = await Promise.all([
          fetch(`${API}/organizations/${slug}/departments`),
          fetch(`${API}/organizations/${slug}/complaints`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const dData = await dRes.json();
        const dept = (dData.items || []).find((d) => d.slug === deptSlug);
        if (!dept) throw new Error("Department not found");

        const cData = await cRes.json();
        const deptComplaints = (cData.complaints || []).filter(
          (c) => c.department === dept.name
        );

        setDept(dept);
        setComplaints(deptComplaints);
      } catch (e) {
        alert(e.message || "Failed to load department");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, deptSlug, token]);

  // --- View complaint in modal ---
  const viewComplaint = (c) => {
    setSelectedComplaint(c);
    setDetailOpen(true);
  };

  // --- Upvote ---
  const vote = async (id) => {
    if (!token) {
      alert("Login to vote");
      return;
    }
    try {
      const res = await fetch(`${API}/complaints/${id}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === id ? { ...c, votes: data.votes } : c))
        );
        if (selectedComplaint?.id === id) {
          setSelectedComplaint((prev) => ({ ...prev, votes: data.votes }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Render ---
  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  if (!dept)
    return (
      <div className="text-center py-20 text-red-600">
        Department not found
      </div>
    );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        {/* Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 z-10">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">{dept.name}</h1>
            <div className="w-9" />
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="text-sm text-gray-600">
            <span
              onClick={goBack}
              className="cursor-pointer hover:text-green-600 transition-colors"
            >
              Department
            </span>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">{dept.name}</span>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {complaints.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No complaints in this department yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {c.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {c.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => vote(c.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-yellow-700 text-sm font-medium transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" /> {c.votes}
                      </button>
                      <button
                        onClick={() => viewComplaint(c)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* --- Complaint Detail Modal --- */}
      <DetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        complaint={selectedComplaint}
        onVote={vote}
      />
    </>
  );
}

/* ============================================= */
/*               DETAIL PANEL MODAL               */
/* ============================================= */
function DetailPanel({ open, onClose, complaint, onVote }) {
  if (!open || !complaint) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Complaint Details
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              {complaint.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(complaint.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* Attachment */}
          {complaint.document && (
            <div className="bg-green-50 p-4 rounded-lg">
              {complaint.document.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={complaint.document}
                  alt="Attachment"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              ) : (
                <a
                  href={complaint.document}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-700 hover:underline text-sm inline-flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" /> View Attachment
                </a>
              )}
            </div>
          )}

          {/* Upvote */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onVote(complaint.id)}
              className="flex items-center gap-1 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-yellow-700 text-sm font-medium transition-colors"
            >
              <ArrowUp className="w-4 h-4" /> Upvote ({complaint.votes})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}