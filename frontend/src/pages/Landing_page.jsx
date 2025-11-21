import React, { useEffect, useRef, useState } from "react";
import { Search, Building2, FileText, Users, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Mock auth functions for demo
const getToken = () => null;
const whoAmI = async () => ({ ok: false });
const clearAuth = () => {};

const API = "/api";

export default function Landing_page() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  // 🔁 If already logged in, forward to the right place
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) return;

    (async () => {
      const me = await whoAmI().catch(() => ({ ok: false }));
      if (cancelled) return;

      if (me.ok) {
        if (me.type === "organization" && me.organizationSlug) {
          navigate(`/organization/${me.organizationSlug}`, { replace: true });
        } else {
          navigate("/user/dashboard", { replace: true });
        }
      } else {
        clearAuth();
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  // debounce typeahead – PUBLIC orgs only
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const h = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        const res = await fetch(
          `${API}/public/organizations/search?q=${encodeURIComponent(q)}`,
          { signal: abortRef.current.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          setSuggestions(data.items);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(h);
  }, [query]);

  const goToOrg = (slug) => {
    setOpen(false);
    navigate(`/organization/${encodeURIComponent(slug)}`);
  };

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const exact = suggestions.find(
      (o) => o.slug.toLowerCase() === q || o.name.toLowerCase() === q
    );
    if (exact) return goToOrg(exact.slug);

    if (suggestions.length > 0) return goToOrg(suggestions[0].slug);

    goToOrg(q);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900">
      {/* Header with bright green accent */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-1 bg-gradient-to-r from-green-100 to-green-200">
                <ShieldCheck size={28} className="text-green-700" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">Public Allegation Portal</h1>
                <div className="text-xs text-slate-500">Transparent. Secure. Accountable.</div>
              </div>
            </div>
          </div>

          {/* Search area */}
          <div className="relative w-full max-w-xl mx-6">
            <div className="flex items-center bg-white ring-1 ring-slate-200 rounded-full px-3 py-2 shadow-sm">
              <Search className="text-green-600" size={18} />
              <input
                type="text"
                placeholder="Search organization..."
                className="ml-3 w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length && setOpen(true)}
                onKeyDown={onKeyDown}
                aria-label="Search organizations"
              />
              <button
                onClick={handleSearch}
                className="ml-3 bg-green-100 text-green-900 px-4 py-1.5 rounded-full font-medium hover:bg-green-200 transition text-sm"
              >
                {loading ? "…" : "Search"}
              </button>
            </div>

            {open && suggestions.length > 0 && (
              <div className="absolute z-30 mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden ring-1 ring-slate-200">
                {suggestions.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => goToOrg(o.slug)}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 transition flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{o.name}</div>
                      <div className="text-xs text-slate-500 truncate">/{o.slug}</div>
                    </div>
                    <div className="text-xs text-slate-400">Go</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {!getToken() ? (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-slate-700 hover:text-slate-900 font-medium px-4 py-2 border border-slate-300 rounded-md hover:border-slate-400 transition">Login</Link>
                
                <Link to="/register" className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-shadow shadow-sm">Register</Link>
              </div>
            ) : (
              <Link to="/user/dashboard" className="text-slate-700 hover:text-slate-900 font-medium">Dashboard</Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-extrabold text-slate-900">Empowering Citizens — Building Accountability</h2>
            <p className="text-lg text-slate-600 max-w-xl">Submit, track and resolve public complaints with ease. Our portal connects citizens with responsible authorities and ensures transparent workflows for faster resolutions.</p>

            <div className="flex items-center gap-4">
              <Link to="/anonymous_complaint" className="inline-flex items-center gap-3 bg-green-600 text-white px-6 py-3 rounded-md font-semibold shadow hover:bg-green-700 transition">
                + Report an Allegation
              </Link>
              {/* <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition">Browse Organizations</Link> */}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <Building2 className="text-green-600 mb-2" size={28} />
                <div className="font-semibold text-slate-900">Multi-Level Admin</div>
                <div className="text-sm text-slate-500">Master, client and department admins for clear responsibility.</div>
              </div>

              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <FileText className="text-green-600 mb-2" size={28} />
                <div className="font-semibold text-slate-900">Complaint Tracking</div>
                <div className="text-sm text-slate-500">Real-time tracking, statuses and audit trail.</div>
              </div>

              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <Users className="text-green-600 mb-2" size={28} />
                <div className="font-semibold text-slate-900">Community Engagement</div>
                <div className="text-sm text-slate-500">Encourage citizen participation and feedback.</div>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="bg-white rounded-2xl p-8 shadow-md border">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="inline-block w-8 h-8 rounded-md bg-green-50 text-green-700 grid place-items-center">1</span>
                  <div>
                    <div className="font-medium">Report an allegation</div>
                    <div className="text-xs text-slate-500">Provide details, attach evidence, submit anonymously if needed.</div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="inline-block w-8 h-8 rounded-md bg-green-50 text-green-700 grid place-items-center">2</span>
                  <div>
                    <div className="font-medium">Search organizations</div>
                    <div className="text-xs text-slate-500">Find public organizations quickly using name or slug.</div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="inline-block w-8 h-8 rounded-md bg-green-50 text-green-700 grid place-items-center">3</span>
                  <div>
                    <div className="font-medium">Track progress</div>
                    <div className="text-xs text-slate-500">Use tracking codes to view complaint status updates.</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-700 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-white mb-2">About</h4>
            <p className="text-gray-100 text-sm">A government-community collaboration for ensuring fair complaint management and transparent communication.</p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-2">Quick Links</h4>
            <ul className="text-gray-100 text-sm space-y-1">
              <li>
                <Link to="/register" className="hover:underline">Register</Link>
              </li>
              <li>
                <Link to="/login" className="hover:underline">Login</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:underline">Contact</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-2">Contact</h4>
            <p className="text-gray-100 text-sm">📍 Rangpur, Bangladesh<br/>📧 support@allegationportal.gov.bd<br/>☎️ +880-1234-567890</p>
          </div>
        </div>
        <div className="text-center text-gray-200 text-sm mt-6 border-t border-green-600 pt-4">© 2025 Public Allegation Portal | Developed by Team B (Chayan, Kheya, Sharmin)</div>
      </footer>
    </div>
  );
}