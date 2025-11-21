// frontend/src/pages/Organization_settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  ArrowLeft,
  Loader2,
  Globe,
  Lock,
  Upload,
  Image as ImageIcon,
  Save,
  Building2,
  FileText,
  AlertCircle,
} from "lucide-react";

const API = "/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

function Card({ children, className = "" }) {
  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </section>
  );
}

export default function Organization_settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  
  // Visibility settings
  const [isPublic, setIsPublic] = useState(true);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load profile");
      }

      if (data.type !== "organization") {
        navigate("/user/dashboard");
        return;
      }

      setProfile(data.profile);
      setIsPublic(data.profile.access_type === "Public");
      setLogoPreview(data.profile.logo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!profile) return;

    setUpdatingVisibility(true);
    try {
      const res = await fetch(`${API}/organizations/${profile.id}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update visibility");
      }

      setIsPublic(data.isPublic);
      alert(`Organization is now ${data.isPublic ? "Public" : "Private"}`);
    } catch (e) {
      alert(e.message || "Failed to update visibility");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("orgId", profile.id);

      // Note: You'll need to create this endpoint in your backend
      const res = await fetch(`${API}/organizations/${profile.id}/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload logo");
      }

      setLogoPreview(data.logoUrl);
      alert("Logo updated successfully!");
      
      // Refresh profile
      fetchProfile();
    } catch (e) {
      alert(e.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium">
            {error || "Organization not found"}
          </div>
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
            <button
              onClick={() => navigate(`/organization/${profile.slug}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
              <p className="text-sm text-gray-600">Manage privacy, branding, and preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Privacy Settings */}
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
              <Globe className="w-5 h-5 text-green-600" />
              Privacy Settings
            </h2>
            <p className="text-sm text-gray-600">
              Control who can view your organization and its complaints
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {isPublic ? (
                    <Globe className="w-5 h-5 text-green-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600" />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {isPublic ? "Public Organization" : "Private Organization"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {isPublic
                    ? "Anyone can view your organization page and complaints"
                    : "Only registered members can view complaints"}
                </p>
              </div>
              <button
                onClick={handleToggleVisibility}
                disabled={updatingVisibility}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 whitespace-nowrap ${
                  isPublic
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {updatingVisibility ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPublic ? (
                  "Make Private"
                ) : (
                  "Make Public"
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">About Privacy Settings</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Public:</strong> Anyone can search for and view your organization</li>
                    <li>• <strong>Private:</strong> Users must be logged in and registered as members</li>
                    <li>• Changing this setting affects all complaints immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Branding */}
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              Branding
            </h2>
            <p className="text-sm text-gray-600">
              Customize your organization's appearance
            </p>
          </div>

          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Organization Logo
              </label>
              
              <div className="flex items-start gap-6">
                {/* Current Logo Preview */}
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Organization logo"
                      className="w-24 h-24 rounded-xl object-cover ring-2 ring-gray-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-green-100 to-green-200 grid place-items-center shadow-sm">
                      <Building2 className="w-12 h-12 text-green-700" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer block"
                    >
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">
                            Click to upload logo
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Recommended: Square image, at least 200x200 pixels
                  </p>
                </div>
              </div>
            </div>

            {/* Organization Info (Read-only) */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Organization Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Organization Name
                  </label>
                  <p className="text-sm text-gray-900 font-medium">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    URL Slug
                  </label>
                  <p className="text-sm text-gray-600 font-mono">{profile.slug}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                To update name or other details, visit your{" "}
                <button
                  onClick={() => navigate("/organization/profile")}
                  className="text-green-600 hover:underline font-medium"
                >
                  Profile page
                </button>
              </p>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-gray-600">
              Irreversible actions that affect your organization
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Archive Organization
                </h3>
                <p className="text-sm text-gray-600">
                  Temporarily disable your organization
                </p>
              </div>
              <button
                onClick={() => alert("Archive feature coming soon")}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-all"
              >
                Archive
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-300 rounded-lg bg-red-50">
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  Delete Organization
                </h3>
                <p className="text-sm text-red-700">
                  Permanently delete your organization and all data
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("This action cannot be undone. Are you absolutely sure?")) {
                    alert("Delete feature coming soon");
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}