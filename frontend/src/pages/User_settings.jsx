import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Settings,
  Mail,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  FileText
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
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
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

export default function User_settings() {
  const navigate = useNavigate();
  const authHeaders = useAuthHeaders();

  const [me, setMe] = useState(null);
  const [org, setOrg] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        
        setName(data?.profile?.name || "");
        setEmail(data?.profile?.email || "");

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
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
          name: name.trim(),
          email: email.trim()
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
          name: name.trim(),
          email: email.trim()
        }
      }));

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("[save profile error]", error);
      setMessage({ type: "error", text: error.message || "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match!" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long!" });
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to change password");
      }

      setMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("[change password error]", error);
      setMessage({ type: "error", text: error.message || "Failed to change password. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading settings...</span>
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
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Manage your account settings and preferences</p>
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

        {/* Profile Information */}
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
              <User className="w-5 h-5 text-green-600" />
              Profile Information
            </h2>
            <p className="text-sm text-gray-600">Update your personal information</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        {/* Security Settings */}
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
              <Lock className="w-5 h-5 text-green-600" />
              Security
            </h2>
            <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        {/* Account Info Sidebar */}
        <Card>
          <div className="mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              Account Information
            </h3>
            <p className="text-sm text-gray-600">Your account details and status</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
              <Badge tone="blue">{me?.type || "user"}</Badge>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
              <p className="text-sm font-medium text-gray-900">
                {loadingOrg ? "Loading..." : (org?.name || "Not linked")}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Member Since</label>
              <p className="text-sm font-medium text-gray-900">
                {me?.profile?.createdAt ? new Date(me.profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link
                to="/user/profile"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 transition-colors py-1"
              >
                <User className="w-4 h-4" />
                View Profile
              </Link>
              <Link
                to="/user/complaints"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 transition-colors py-1"
              >
                <FileText className="w-4 h-4" />
                My Complaints
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}