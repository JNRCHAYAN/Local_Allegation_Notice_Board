import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  PlusCircle,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Mail,
  Calendar,
  Shield,
  Save,
  X,
  Edit2,
  ArrowLeft,
  Loader2
} from "lucide-react";

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
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    red: "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>{children}</section>;
}

export default function User_profile() {
  const navigate = useNavigate();
  const authHeaders = useAuthHeaders();

  const [me, setMe] = useState(null);
  const [org, setOrg] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: "include", headers: { ...authHeaders } });
        if (!res.ok) throw new Error(`auth/me ${res.status}`);
        const data = await res.json();
        setMe(data);
        setEditName(data?.profile?.name || "");
        setEditEmail(data?.profile?.email || "");

        let orgSlug = "";
        if (data?.type === "organization") {
          orgSlug = data?.profile?.slug || "";
        } else if (data?.type === "user") {
          const directSlug = data?.organization?.slug || data?.organizationSlug || "";
          if (directSlug) {
            orgSlug = directSlug;
          } else {
            const orgRes = await fetch(`${API}/my/organizations`, { headers: { ...authHeaders }, credentials: "include" });
            const orgs = await orgRes.json();
            orgSlug = Array.isArray(orgs) && orgs.length ? orgs[0].slug : "";
          }
        }

        if (orgSlug) {
          setLoadingOrg(true);
          const orgRes = await fetch(`${API}/organizations/${encodeURIComponent(orgSlug)}`, {
            credentials: "include",
            headers: { ...authHeaders },
          });
          if (orgRes.ok) {
            const orgData = await orgRes.json();
            setOrg(orgData?.organization || null);
          }
          setLoadingOrg(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, [authHeaders]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return "—";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API}/auth/update-profile`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setMe(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          name: editName.trim(),
          email: editEmail.trim()
        }
      }));

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("[save profile error]", error);
      setMessage({ type: "error", text: error.message || "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(me?.profile?.name || "");
    setEditEmail(me?.profile?.email || "");
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  };

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/user/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-sm text-gray-600">Manage your account information</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Message Alert */}
        {message.text && (
          <div className={`px-4 py-3 rounded-xl border ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-700" 
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <User className="w-5 h-5 text-green-600" />
              Personal Information
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Avatar and Basic Info */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm flex-shrink-0">
                <User className="w-10 h-10 text-green-700" />
              </div>
              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900">{me?.profile?.name || "User"}</h3>
                    <p className="text-sm text-gray-600 mt-1">{me?.profile?.email || "—"}</p>
                    <div className="mt-2">
                      <Badge tone="blue">{me?.type || "user"}</Badge>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          {!isEditing && (
            <div className="pt-6 border-t border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{me?.profile?.email || "—"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium capitalize">{me?.type || "—"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Member Since</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{formatDate(me?.profile?.createdAt)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {loadingOrg ? "Loading..." : (org?.name || "Not linked")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Organization Card */}
        {org && (
          <Card>
            <div className="mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
                <Building2 className="w-5 h-5 text-green-600" />
                Organization
              </h2>
              <p className="text-sm text-gray-600">Your organization membership</p>
            </div>

            {loadingOrg ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
              </div>
            ) : (
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="w-20 h-20 rounded-xl object-cover ring-2 ring-gray-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-100 to-green-200 grid place-items-center shadow-sm">
                      <Building2 className="w-10 h-10 text-green-700" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Organization Name</label>
                    <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Access Type</label>
                    <Badge tone={org.access_type === "Public" ? "green" : "red"}>
                      {org.access_type}
                    </Badge>
                  </div>

                  {org.description && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <p className="text-sm text-gray-700 line-clamp-2">{org.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700">
            <Settings className="w-5 h-5" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              to="/user/settings"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Advanced Settings</p>
                  <p className="text-xs text-gray-500">Security and preferences</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
            </Link>

            <Link
              to="/user/complaints"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">My Complaints</p>
                  <p className="text-xs text-gray-500">View and manage complaints</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}