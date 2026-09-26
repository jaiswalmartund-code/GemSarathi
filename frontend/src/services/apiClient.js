const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiRequest(path, options = {}) {
  const token = window.localStorage.getItem("gem_access_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) return null;
  return response.json();
}
