import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, getCurrentUser, logout as apiLogout } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("gem_access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user session", err);
        localStorage.removeItem("gem_access_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const session = await apiLogin({ email, password });
    if (session?.user) {
      setUser(session.user);
    } else {
      const userData = await getCurrentUser();
      setUser(userData);
    }
    return session;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
