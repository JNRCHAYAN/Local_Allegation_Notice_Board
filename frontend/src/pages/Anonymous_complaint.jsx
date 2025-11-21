// src/pages/Anonymous_complaint.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UploadCloud, Loader2, FileText, ArrowLeft, ShieldCheck } from "lucide-react";

const API = "/api";
const NONE_DEPT = "NONE_DEPT";

export default function Anonymous_complaint() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromOrgSlug = location.state?.organizationSlug;

  // ---------- state ----------
  const [organizations, setOrganizations] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgErr, setOrgErr] = useState("");

  const [departments, setDepartments] = useState(null);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [depErr, setDepErr] = useState("");

  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    organizationId: "",
    departmentId: NONE_DEPT,
    description: "",
    priority: "Low",
  });

  // ---------- effects ----------
  useEffect(() => {
    let canceled = false;
    async function loadOrganizations() {
      setLoadingOrgs(true);
      setOrgErr("");
      try {
        const res = await fetch(`${API}/organizations`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : data;
        const normalized = (items ?? []).map((o) => ({
          id: o.id ?? o.organizationId ?? o.slug ?? String(o.name),
          name: o.name ?? o.title ?? o.slug ?? "Organization",
        }));
        if (!canceled) setOrganizations(normalized);
      } catch {
        if (!canceled) {
          setOrganizations([
            { id: "org-municipality", name: "Sample Municipality" },
            { id: "org-water", name: "Sample Water Board" },
            { id: "org-health", name: "Sample Health Org" },
          ]);
          setOrgErr("Showing cached organizations.");
        }
      } finally {
        if (!canceled) setLoadingOrgs(false);
      }
    }
    loadOrganizations();
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    let canceled = false;
    async function loadDepartments() {
      if (!form.organizationId) {
        setDepartments(null);
        setDepErr("");
        setLoadingDeps(false);
        return;
      }
      setLoadingDeps(true);
      setDepErr("");
      try {
        const res = await fetch(
          `${API}/departments?organizationId=${encodeURIComponent(form.organizationId)}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch departments");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : data;
        const normalized = (items ?? []).map((d) => ({
          id: d.id ?? d.departmentId ?? d.slug ?? String(d.name),
          name: d.name ?? d.title ?? d.slug ?? "Department",
        }));
        if (!canceled) setDepartments(normalized);
      } catch {
        if (!canceled) {
          setDepartments([
            { id: "municipality", name: "Municipality" },
            { id: "water", name: "Water Department" },
            { id: "electricity", name: "Electricity Board" },
            { id: "health", name: "Health Department" },
          ]);
          setDepErr("Showing cached departments.");
        }
      } finally {
        if (!canceled) setLoadingDeps(false);
      }
    }
    loadDepartments();
    return () => { canceled = true; };
  }, [form.organizationId]);

  // ---------- handlers ----------
  const handleFileChange = (e) => {
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
    if (!okTypes.includes(f.type) && !/\.(jpg|jpeg|png|pdf|mp4|mp3)$/i.test(f.name)) {
      setFormErr("Unsupported file type. Allowed: .jpg, .png, .pdf, .mp4, .mp3");
      setFileObj(null);
      setFileName("");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFormErr("File too large. Max 10MB.");
      setFileObj(null);
      setFileName("");
      return;
    }
    setFormErr("");
    setFileObj(f);
    setFileName(f.name);
  };

  const update = (key) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      if (key === "organizationId") {
        return { ...prev, organizationId: val, departmentId: NONE_DEPT };
      }
      return { ...prev, [key]: val };
    });
  };

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 6 &&
      String(form.organizationId).length > 0 &&
      form.description.trim().length >= 15 &&
      !submitting
    );
  }, [form, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormErr("");
    setSuccessMsg("");

    if (!canSubmit) {
      setFormErr("Please complete the required fields.");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("organizationId", String(form.organizationId));
      if (form.departmentId && form.departmentId !== NONE_DEPT) {
        fd.append("departmentId", String(form.departmentId));
      } else {
        fd.append("scope", "organization");
      }
      fd.append("description", form.description.trim());
      fd.append("priority", form.priority);
      fd.append("isAnonymous", "true");
      if (fileObj) fd.append("attachment", fileObj);

      const res = await fetch(`${API}/complaints`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      let payload = null;
      const text = await res.text();
      try { payload = text ? JSON.parse(text) : null; } catch { /* raw text */ }

      if (!res.ok || (payload && payload.success === false)) {
        const msg = payload?.message || text || "Failed to submit complaint";
        throw new Error(msg);
      }

      const tracking = payload?.trackingCode ?? payload?.data?.trackingCode;
      setSuccessMsg(
        `Complaint submitted successfully${tracking ? ` (Tracking: ${tracking})` : ""}.`
      );

      setForm({
        title: "",
        organizationId: "",
        departmentId: NONE_DEPT,
        description: "",
        priority: "Low",
      });
      setFileObj(null);
      setFileName("");

      // Navigate back after success
      setTimeout(() => {
        if (fromOrgSlug) {
          navigate(`/organization/${fromOrgSlug}`);
        } else {
          navigate("/");
        }
      }, 1500);
    } catch (err) {
      setFormErr(typeof err?.message === "string" ? err.message : "Could not submit complaint.");
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
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Anonymous Complaint</h1>
              <p className="text-xs text-gray-500">Submit without revealing your identity</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (fromOrgSlug) {
                navigate(`/organization/${fromOrgSlug}`);
              } else {
                navigate(-1);
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
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
          {/* Status Messages */}
          {orgErr && (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
              {orgErr}
            </div>
          )}
          {depErr && (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
              {depErr}
            </div>
          )}
          {formErr && (
            <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
              {formErr}
            </div>
          )}
          {successMsg && (
            <div className="text-green-800 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Complaint Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={update("title")}
              placeholder="Enter complaint title"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              minLength={6}
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">Minimum 6 characters required</p>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={form.organizationId}
              onChange={update("organizationId")}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:opacity-60 cursor-pointer"
              disabled={loadingOrgs}
              required
            >
              <option value="">— Select an organization —</option>
              {(organizations ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Choose the organization to file complaint against
            </p>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Department (Optional)
            </label>
            <select
              value={form.departmentId}
              onChange={update("departmentId")}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:opacity-60 cursor-pointer"
              disabled={loadingDeps || !form.organizationId}
            >
              <option value={NONE_DEPT}>None (entire organization)</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Select a specific department or keep "None"
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
              onChange={update("description")}
              placeholder="Describe your complaint in detail..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none transition-all"
              minLength={15}
              required
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
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf,.mp4,.mp3"
              />
              <label
                htmlFor="file-upload"
                className="bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-green-700 transition-colors text-sm font-medium"
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
                    onChange={update("priority")}
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
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Anonymous Submission</p>
                <p>Your identity will not be revealed. However, providing accurate details helps resolve the issue faster.</p>
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
                  navigate(-1);
                }
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-sm ${
                canSubmit ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
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