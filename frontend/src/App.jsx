import { useState, useEffect, createContext, useContext } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Editor from "./pages/Editor";
import Dashboard from "./pages/Dashboard";
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
  const [page, setPage] = useState("login");

  useEffect(() => {
    if (user) {
      setPage(user.role === "admin" ? "dashboard" : "editor");
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
        {user && user.role === "admin" && (
          <Dashboard onLogout={logout} onGoEditor={() => setPage("editor")} />
        )}
        {user && page === "editor" && (
          <Editor onLogout={logout} onDashboard={user?.role === "admin" ? () => setPage("dashboard") : null} />
        )}
      </div>
    </AuthContext.Provider>
  );
}
