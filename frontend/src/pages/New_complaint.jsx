// src/pages/New_complaint.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, UploadCloud, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

const API = "/api";
const NONE_DEPARTMENT = "NONE_DEPARTMENT";

// ---------- auth header helper ----------
function useAuthHeaders() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  return useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
}

export default function New_complaint() {
  const navigate = useNavigate();
  const authHeaders = useAuthHeaders();
  const location = useLocation();
  const fromOrgSlug = location.state?.organizationSlug;

  // ---------- state ----------
  const [me, setMe] = useState(null);
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState("");
  const [departments, setDepartments] = useState([{ id: NONE_DEPARTMENT, name: "None (entire organization)" }]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [booting, setBooting] = useState(true);

  const [form, setForm] = useState({
    title: "",
    departmentId: NONE_DEPARTMENT,
    description: "",
    priority: "Low",
  });

  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // ---------- boot: who am i? which org? ----------
  useEffect(() => {
    let canceled = false;

    (async () => {
      setErr("");
      setBooting(true);
      try {
        const meRes = await fetch(`${API}/auth/me`, {
          credentials: "include",
          headers: { ...authHeaders },
        });
        if (meRes.status === 401) {
          navigate("/login");
          return;
        }
        if (!meRes.ok) throw new Error("Failed to load your session.");
        const meData = await meRes.json();
        if (canceled) return;
        setMe(meData);

        let _orgId = "";
        let _orgSlug = "";

        if (meData?.type === "organization") {
          _orgId = meData?.profile?.id;
          _orgSlug = meData?.profile?.slug;
        } else if (meData?.type === "user") {
          const oRes = await fetch(`${API}/my/organizations`, {
            headers: { ...authHeaders },
            credentials: "include",
          });
          if (!oRes.ok) throw new Error("Could not get your organizations.");
          const orgs = await oRes.json();
          if (!Array.isArray(orgs) || orgs.length === 0) {
            throw new Error("You are not linked to any organization.");
          }
          _orgId = orgs[0].id;
          _orgSlug = orgs[0].slug;
        } else {
          throw new Error("Unknown account type.");
        }

        if (!_orgId) throw new Error("Organization context missing.");
        setOrgId(String(_orgId));
        setOrgSlug(String(_orgSlug || ""));

        setLoadingDeps(true);
        const depRes = await fetch(`${API}/departments?organizationId=${encodeURIComponent(_orgId)}`, {
          credentials: "include",
          headers: { ...authHeaders },
        });
        if (!depRes.ok) throw new Error("Failed to load departments.");
        const depJson = await depRes.json();
        const items = Array.isArray(depJson?.items) ? depJson.items : [];
        const normalized = items.map((d) => ({
          id: d.id,
          name: d.name || "Department",
        }));
        if (canceled) return;
        setDepartments([{ id: NONE_DEPARTMENT, name: "None (entire organization)" }, ...normalized]);
      } catch (e) {
        if (!canceled) setErr(e?.message || "Could not initialize the form.");
      } finally {
        if (!canceled) {
          setLoadingDeps(false);
          setBooting(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [authHeaders, navigate]);

  // ---------- validation ----------
  const canSubmit =
    form.title.trim().length >= 6 &&
    form.description.trim().length >= 15 &&
    !submitting &&
    !!orgId;

  // ---------- file handling ----------
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFileObj(null);
      setFileName("");
      return;
    }
    const okTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "audio/mpeg",
      "video/mp4",
      "audio/mp3",
    ];
    const nameOk = /\.(jpg|jpeg|png|pdf|mp4|mp3)$/i.test(f.name);
    if (!okTypes.includes(f.type) && !nameOk) {
      setErr("Unsupported file type. Allowed: .jpg, .png, .pdf, .mp4, .mp3");
      setFileObj(null);
      setFileName("");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErr("File too large. Max 10MB.");
      setFileObj(null);
      setFileName("");
      return;
    }
    setErr("");
    setFileObj(f);
    setFileName(f.name);
  };

  // ---------- submit ----------
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");

    if (!canSubmit) {
      setErr("Please complete the required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("organizationId", String(orgId));
      if (orgSlug) fd.append("organizationSlug", orgSlug);

      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("priority", form.priority);
      fd.append("isAnonymous", "false");

      if (
        form.departmentId === NONE_DEPARTMENT ||
        String(form.departmentId).toUpperCase() === "NONE" ||
        String(form.departmentId).toUpperCase() === "NONE_DEPT"
      ) {
        fd.append("scope", "organization");
      } else {
        fd.append("departmentId", String(form.departmentId));
      }

      if (fileObj) fd.append("attachment", fileObj);

      const res = await fetch(`${API}/complaints`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { ...authHeaders },
      });

      const raw = await res.text();
      let json;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        /* ignore parse error */
      }

      if (!res.ok || json?.success === false) {
        const msg = json?.message || raw || "Failed to submit complaint.";
        throw new Error(msg);
      }

      const tracking = json?.trackingCode ?? json?.data?.trackingCode;
      setSuccess(`Complaint submitted successfully${tracking ? ` (Tracking: ${tracking})` : ""}.`);

      setForm({
        title: "",
        departmentId: NONE_DEPARTMENT,
        description: "",
        priority: "Low",
      });
      setFileObj(null);
      setFileName("");

      setTimeout(() => {
        if (fromOrgSlug) {
          navigate(`/organization/${fromOrgSlug}`);
        } else {
          navigate("/user/dashboard");
        }
      }, 1500);
    } catch (e) {
      setErr(e?.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">New Complaint</h1>
              <p className="text-xs text-gray-500">Submit a complaint as a member</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (fromOrgSlug) {
                navigate(`/organization/${fromOrgSlug}`);
              } else {
                navigate("/user/dashboard");
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-6">
        <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
          {/* Status Messages */}
          {err && (
            <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
              {err}
            </div>
          )}
          {success && (
            <div className="text-green-800 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Organization Indicator */}
          {orgSlug && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-700">Organization: </span>
              <span className="text-sm text-gray-900 font-semibold">{booting ? "Loading..." : orgSlug}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Complaint Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="Enter complaint title"
              minLength={6}
              required
              disabled={booting}
            />
            <p className="mt-1.5 text-xs text-gray-500">Minimum 6 characters required</p>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Department (Optional)
            </label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:opacity-60 cursor-pointer"
              disabled={loadingDeps || booting}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Select a specific department or keep "None (entire organization)"
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none transition-all"
              placeholder="Describe your complaint in detail..."
              minLength={15}
              required
              disabled={booting}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Include location, dates, and references if available. Minimum 15 characters.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Attachment (Optional)
            </label>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 flex justify-between items-center bg-gray-50 hover:border-green-500 hover:bg-green-50 transition-all">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-800 font-medium">
                    {fileName || "No file selected"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Supported: .jpg, .png, .pdf, .mp4, .mp3 (max 10MB)
                  </div>
                </div>
              </div>
              <input
                type="file"
                id="file-input"
                onChange={handleFile}
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.mp4,.mp3"
                disabled={booting}
              />
              <label
                htmlFor="file-input"
                className={`px-4 py-2 rounded-lg cursor-pointer text-white text-sm font-medium transition-colors ${
                  booting ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Browse
              </label>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Priority Level
            </label>
            <div className="flex gap-6 mt-2">
              {["Low", "Medium", "High"].map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={form.priority === p}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    disabled={booting}
                    className="w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-gray-700">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Member Submission</p>
                <p>This complaint will be submitted under your account. You can track its status from your dashboard.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (fromOrgSlug) {
                  navigate(`/organization/${fromOrgSlug}`);
                } else {
                  navigate("/user/dashboard");
                }
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || booting}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-sm ${
                canSubmit && !booting ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}