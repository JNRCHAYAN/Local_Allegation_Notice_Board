// frontend/src/pages/Register.jsx
import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = "/api";

// ============= VALIDATION UTILITIES =============
const validateEmail = (email) => {
  const emailRegex = /^[a-z0-9]+@[a-z0-9]+\.[a-z0-9]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
};

// ============= MAIN COMPONENT =============
export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState("role");

  // Get the redirect path from location state (private org page)
  const from = location.state?.from || null;

  // After successful registration → go to login preserving `from`
  const handleSuccess = () => {
    navigate("/login", { state: { from }, replace: true });
  };

  if (step === "role") {
    return <RoleSelection onSelectRole={setStep} from={from} />;
  }

  if (step === "user") {
    return <UserRegistration onBack={() => setStep("role")} onSuccess={handleSuccess} from={from} />;
  }

  if (step === "organization") {
    return <OrganizationRegistration onBack={() => setStep("role")} onSuccess={handleSuccess} from={from} />;
  }

  return null;
}

// ============= ROLE SELECTION PAGE =============
function RoleSelection({ onSelectRole, from }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
            {/* Back Button */}
    <button
      onClick={() => window.history.back()}
      className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors group"
      aria-label="Go back"
    >
      <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to the Portal
          </h1>
          <p className="text-lg text-gray-600">
            Let's get you started. Which best describes you?
          </p>

          {/* Show message if coming from private org */}
          {from && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 inline-block">
              <p className="text-sm text-blue-700">
                Register to access the organization you requested
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* User Card */}
          <button
            onClick={() => onSelectRole("user")}
            className="group relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm a User</h2>
              <p className="text-gray-600">
                Join an existing organization as a member to submit and track complaints
              </p>
            </div>

            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Submit complaints
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Track status updates
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Vote on complaints
              </li>
            </ul>

            <div className="text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform inline-flex items-center">
              Register as User
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>

          {/* Organization Card */}
          <button
            onClick={() => onSelectRole("organization")}
            className="group relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm an Organization</h2>
              <p className="text-gray-600">
                Create a new organization account to manage complaints and departments
              </p>
            </div>

            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Manage complaints
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Create departments
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                View analytics
              </li>
            </ul>

            <div className="text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform inline-flex items-center">
              Register as Organization
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href={from ? `/login?from=${encodeURIComponent(from)}` : "/login"}
              className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============= USER REGISTRATION =============
function UserRegistration({ onBack, onSuccess, from }) {
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const selectedOrg = useMemo(
    () => orgs.find((o) => String(o.id) === String(selectedOrgId)),
    [orgs, selectedOrgId]
  );

  const passwordStrength = useMemo(() => validatePassword(form.password), [form.password]);

  useEffect(() => {
    fetch(`${API}/organizations`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setOrgs(list);
      })
      .catch(() => setOrgs([]));
  }, []);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Full name is required";
        } else if (value.trim().length < 2) {
          newErrors.name = "Name must be at least 2 characters";
        } else {
          delete newErrors.name;
        }
        break;

      case "email":
        if (!value.trim()) {
          newErrors.email = "Email is required";
        } else if (/[A-Z]/.test(value)) {
          newErrors.email = "Email must be lowercase only";
        } else if (/\s/.test(value)) {
          newErrors.email = "Email cannot contain spaces";
        } else if (!validateEmail(value.toLowerCase())) {
          newErrors.email = "Email must contain only letters (a-z) and numbers (0-9)";
        } else {
          delete newErrors.email;
        }
        break;

      case "password":
        if (!value) {
          newErrors.password = "Password is required"; 
        } else if (value.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else {
          delete newErrors.password;
        }
        if (form.confirmPassword && value !== form.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        } else if (form.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (value !== form.password) {
          newErrors.confirmPassword = "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (value) validateField(field, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (/[A-Z]/.test(form.email)) {
      newErrors.email = "Email must be lowercase only";
    } else if (/\s/.test(form.email)) {
      newErrors.email = "Email cannot contain spaces";
    } else if (!validateEmail(form.email.toLowerCase())) {
      newErrors.email = "Email must contain only letters (a-z) and numbers (0-9)";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!selectedOrgId) {
      newErrors.organization = "Please select an organization";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    setBusy(true);
    setMsg("");

    if (!validateForm()) {
      setBusy(false);
      setMsg("Please fix all errors before submitting");
      return;
    }

    try {
      const res = await fetch(`${API}/register/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          address: form.address.trim(),
          description: form.description.trim(),
          organizationId: Number(selectedOrgId),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Registration failed");
      }

      setMsg("Registration successful!");
      setTimeout(() => onSuccess?.(), 600);
    } catch (err) {
      setMsg(" " + (err.message || "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  const initials = (name) =>
    (name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-gray-200 p-10">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to role selection
        </button>

        <div className="mb-8 text-center border-b border-gray-200 pb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Registration</h1>
          <p className="text-sm text-gray-600">Join an existing organization as a member</p>
          {from && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700">
                After registration, you'll be able to access the organization
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Organization</h2>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-xl bg-white border border-gray-300 flex items-center justify-center overflow-hidden">
                  {selectedOrg?.logo ? (
                    <img src={selectedOrg.logo} alt={selectedOrg.name} className="w-full h-full object-cover" />
                  ) : selectedOrg ? (
                    <span className="text-xl font-bold text-gray-500">{initials(selectedOrg.name)}</span>
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <Select
                  label="Organization"
                  value={selectedOrgId}
                  onChange={(v) => {
                    setSelectedOrgId(v);
                    if (v) delete errors.organization;
                  }}
                  options={[
                    { value: "", label: "— Select an organization —" },
                    ...orgs.map((o) => ({ value: String(o.id), label: o.name })),
                  ]}
                  error={errors.organization}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(v) => handleInputChange("name", v)}
                onBlur={() => validateField("name", form.name)}
                error={errors.name}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(v) => handleInputChange("email", v)}
                onBlur={() => validateField("email", form.email)}
                error={errors.email}
                required
              />
              <PasswordInput
                label="Password"
                value={form.password}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                onChange={(v) => handleInputChange("password", v)}
                onBlur={() => validateField("password", form.password)}
                error={errors.password}
                strength={passwordStrength}
                required
              />
              <PasswordInput
                label="Confirm Password"
                value={form.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                onChange={(v) => handleInputChange("confirmPassword", v)}
                onBlur={() => validateField("confirmPassword", form.confirmPassword)}
                error={errors.confirmPassword}
                required
              />
              <Input
                label="Address (Optional)"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
            </div>
            <div className="mt-4">
              <TextArea
                label="Description (Optional)"
                rows={3}
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={submit}
              disabled={busy || Object.keys(errors).length > 0 || !selectedOrgId}
              className="w-full md:w-auto min-w-[240px] rounded-lg px-8 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {busy ? "Processing..." : "Register as Member"}
            </button>

            {msg && (
              <div className="text-sm font-medium">
                {msg.startsWith("Registration successful!") ? (
                  <span className="text-emerald-600">{msg}</span>
                ) : (
                  <span className="text-red-600">{msg}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= ORGANIZATION REGISTRATION =============
function OrganizationRegistration({ onBack, onSuccess, from }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    description: "",
    orgName: "",
    orgType: "Public",
    logo: null,
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => validatePassword(form.password), [form.password]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case "name":
      case "orgName":
        if (!value.trim()) {
          newErrors[name] = name === "name" ? "Admin name is required" : "Organization name is required";
        } else if (value.trim().length < 2) {
          newErrors[name] = "Must be at least 2 characters";
        } else {
          delete newErrors[name];
        }
        break;

      case "email":
        if (!value.trim()) {
          newErrors.email = "Email is required";
        } else if (!validateEmail(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;

      case "password":
        if (!value) {
          newErrors.password = "Password is required";
        } else if (value.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else {
          delete newErrors.password;
        }
        if (form.confirmPassword && value !== form.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        } else if (form.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (value !== form.password) {
          newErrors.confirmPassword = "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      case "address":
        if (!value.trim()) {
          newErrors.address = "Address is required";
        } else {
          delete newErrors.address;
        }
        break;

      case "description":
        if (!value.trim()) {
          newErrors.description = "Description is required";
        } else {
          delete newErrors.description;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (value) validateField(field, value);
  };

  const handleLogoFile = (file) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setForm((f) => ({ ...f, logo: file }));
    } else {
      setLogoPreview(null);
      setForm((f) => ({ ...f, logo: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Admin name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (/[A-Z]/.test(form.email)) {
      newErrors.email = "Email must be lowercase only";
    } else if (/\s/.test(form.email)) {
      newErrors.email = "Email cannot contain spaces";
    } else if (!validateEmail(form.email.toLowerCase())) {
      newErrors.email = "Email must contain only letters (a-z) and numbers (0-9)";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (!form.orgName.trim()) newErrors.orgName = "Organization name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    setBusy(true);
    setMsg("");

    if (!validateForm()) {
      setBusy(false);
      setMsg("Please fix all errors before submitting");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("password", form.password);
      fd.append("address", form.address.trim());
      fd.append("description", form.description.trim());
      fd.append("orgName", form.orgName.trim());
      fd.append("orgType", form.orgType);
      if (form.logo) fd.append("logo", form.logo);

      const res = await fetch(`${API}/register/organization`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Registration failed");
      }

      setMsg("Organization created successfully!");
      setTimeout(() => onSuccess?.(), 600);
    } catch (err) {
      setMsg(" " + (err.message || "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-gray-200 p-10">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to role selection
        </button>

        <div className="mb-8 text-center border-b border-gray-200 pb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Registration</h1>
          <p className="text-sm text-gray-600">Create a new organization account</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <label className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer flex items-center justify-center overflow-hidden transition-all">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <svg className="w-6 h-6 text-emerald-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs text-gray-500">Upload</span>
                      </div>
                    )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex-1 space-y-4">
                <Input
                  label="Organization Name"
                  value={form.orgName}
                  onChange={(v) => handleInputChange("orgName", v)}
                  onBlur={() => validateField("orgName", form.orgName)}
                  error={errors.orgName}
                  placeholder="Enter organization name"
                  required
                />
                <Select
                  label="Organization Type"
                  value={form.orgType}
                  onChange={(v) => setForm({ ...form, orgType: v })}
                  options={[
                    { value: "Public", label: "Public" },
                    { value: "Private", label: "Private" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(v) => handleInputChange("name", v)}
                onBlur={() => validateField("name", form.name)}
                error={errors.name}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(v) => handleInputChange("email", v)}
                onBlur={() => validateField("email", form.email)}
                error={errors.email}
                required
              />
              <PasswordInput
                label="Password"
                value={form.password}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                onChange={(v) => handleInputChange("password", v)}
                onBlur={() => validateField("password", form.password)}
                error={errors.password}
                strength={passwordStrength}
                required
              />
              <PasswordInput
                label="Confirm Password"
                value={form.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                onChange={(v) => handleInputChange("confirmPassword", v)}
                onBlur={() => validateField("confirmPassword", form.confirmPassword)}
                error={errors.confirmPassword}
                required
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(v) => handleInputChange("address", v)}
                onBlur={() => validateField("address", form.address)}
                error={errors.address}
                required
              />
            </div>
            <div className="mt-4">
              <TextArea
                label="Description"
                rows={3}
                value={form.description}
                onChange={(v) => handleInputChange("description", v)}
                onBlur={() => validateField("description", form.description)}
                error={errors.description}
                placeholder="Tell us about your organization..."
                required
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={submit}
              disabled={busy || Object.keys(errors).length > 0}
              className="w-full md:w-auto min-w-[240px] rounded-lg px-8 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {busy ? "Processing..." : "Create Organization"}
            </button>

            {msg && (
              <div className="text-sm font-medium">
                {msg.startsWith("Organization created") ? (
                  <span className="text-emerald-600">{msg}</span>
                ) : (
                  <span className="text-red-600">{msg}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= UI PRIMITIVES =============
function Label({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>;
}

function Input({ label, readOnly = false, type = "text", value, onChange, onBlur, required = false, placeholder, error }) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <input
        type={type}
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : readOnly
            ? "border-gray-200 text-gray-600 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({ label, value, show, onToggle, onChange, onBlur, error, strength, required = false }) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder="Enter password"
          required={required}
          className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm outline-none transition-all ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {show ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {strength && value && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => {
              const checks = Object.values(strength).filter(Boolean).length;
              return (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded ${
                    i < checks
                      ? checks === 4
                        ? "bg-emerald-500"
                        : checks === 3
                        ? "bg-yellow-500"
                        : "bg-red-500"
                      : "bg-gray-200"
                  }`}
                />
              );
            })}
          </div>
          <p className="text-xs text-gray-600">
            Password must have: 8+ characters, uppercase, lowercase, and number
          </p>
        </div>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function TextArea({ label, rows = 3, value, onChange, onBlur, placeholder, error, required = false }) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all resize-none ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, error, required = false }) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}