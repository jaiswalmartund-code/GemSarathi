import { apiRequest } from "@/services/apiClient";

export async function login(credentials) {
  const session = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
  window.localStorage.setItem("gem_access_token", session.access_token);
  return session;
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function logout() {
  window.localStorage.removeItem("gem_access_token");
}
