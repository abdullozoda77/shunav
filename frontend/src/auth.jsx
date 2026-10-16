import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

// Who is logged in. Any page can call useAuth().
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // On start: if a token is saved, ask the server who we are
  useEffect(() => {
    if (!getToken()) return;
    api
      .get("/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const data = await api.post("/login", { username, password });
    setToken(data.access_token);
    setUser(await api.get("/me"));
  }

  async function register(form) {
    await api.post("/register", form);
    await login(form.username, form.password);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
