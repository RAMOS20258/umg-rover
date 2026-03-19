import { useState, useEffect, createContext, useContext } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Editor from "./pages/Editor";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import "./styles/global.css";

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("umg_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [page, setPage] = useState(() => {
    const storedUser = localStorage.getItem("umg_user");
    if (!storedUser) return "login";

    try {
      const parsed = JSON.parse(storedUser);
      return parsed?.role === "admin" || parsed?.role === "supervisor"
        ? "dashboard"
        : "editor";
    } catch {
      return "login";
    }
  });

  useEffect(() => {
    if (!user) {
      setPage("login");
      return;
    }

    if (user.role === "admin" || user.role === "supervisor") {
      setPage("dashboard");
    } else {
      setPage("editor");
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("umg_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("umg_user");
    localStorage.removeItem("umg_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_data");
    setPage("login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="app-root">
        {!user && page === "login" && (
          <Login onRegister={() => setPage("register")} />
        )}

        {!user && page === "register" && (
          <Register onLogin={() => setPage("login")} />
        )}

        {user && page === "dashboard" && (
          <Dashboard
            onLogout={logout}
            onGoEditor={() => setPage("editor")}
          />
        )}

        {user && page === "editor" && (
          <Editor
            onLogout={logout}
            onDashboard={
              user?.role === "admin" || user?.role === "supervisor"
                ? () => setPage("dashboard")
                : null
            }
            onProfile={() => setPage("profile")}
          />
        )}

        {user && page === "profile" && (
          <Profile
            onLogout={logout}
            onBack={() => setPage("editor")}
          />
        )}
      </div>
    </AuthContext.Provider>
  );
}
