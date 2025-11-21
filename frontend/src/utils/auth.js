// frontend/src/utils/auth.js
export const TOKEN_KEY = "token";
export const USER_ID_KEY = "userId";
export const ORG_ID_KEY = "orgId";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuth({ token, userId, orgId }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (userId) localStorage.setItem(USER_ID_KEY, String(userId));
  if (orgId) localStorage.setItem(ORG_ID_KEY, String(orgId));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(ORG_ID_KEY);
}

export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Validate current token and learn who we are.
// Returns: { ok: boolean, type: 'user'|'organization'|null, organizationSlug?: string }
export async function whoAmI() {
  const res = await fetch("/api/auth/me", { headers: { ...authHeaders() } });
  if (!res.ok) return { ok: false, type: null };
  const data = await res.json().catch(() => ({}));
  if (!data?.success) return { ok: false, type: null };

  if (data.type === "user") {
    return {
      ok: true,
      type: "user",
      organizationSlug: data.organization?.slug || null,
    };
  }
  if (data.type === "organization") {
    return { ok: true, type: "organization", organizationSlug: data.profile?.slug };
  }
  return { ok: false, type: null };
}
// ========================================================================new stuff for organizations
// export const getToken = () => localStorage.getItem("token");
// export const getUserType = () => {
//   try {
//     const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
//     return payload.role;               // "user" | "organization"
//   } catch { return null; }
// };
// export const getOrgSlug = () => {
//   try {
//     const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
//     return payload.slug;
//   } catch { return null; }
// };
// export const logout = () => {
//   localStorage.removeItem("token");
//   window.location.href = "/";
// };