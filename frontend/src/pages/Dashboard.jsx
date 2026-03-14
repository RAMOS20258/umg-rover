import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../App";
import "../styles/dashboard.css";
import logoUMG from "../assets/avatar-presets/umg/LOGOUMG.png";

const API = "https://backend-production-793b.up.railway.app";

export default function Dashboard({ onLogout, onGoEditor }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("accesos");

  const [accesos, setAccesos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    logins_today: 0,
    total_programs: 0,
  });

  const [loading, setLoading] = useState(true);

  const token = useMemo(() => localStorage.getItem("umg_token"), []);

  const buildAuthHeaders = useCallback(() => {
    if (!token) return {};
    const value = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    return { Authorization: value };
  }, [token]);

  const getAvatarSrc = (avatar) => {
    if (!avatar || typeof avatar !== "string") return null;

    // Si ya viene como data URL completa
    if (avatar.startsWith("data:image")) return avatar;

    // Si viene solo el base64
    return `data:image/jpeg;base64,${avatar}`;
  };

  const fetchJSON = useCallback(
    async (url) => {
      if (!token) {
        console.error("No hay token en localStorage (umg_token).");
        onLogout?.();
        throw new Error("Missing token");
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...buildAuthHeaders(),
        },
      });

      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        console.error("401 Unauthorized:", body);
        onLogout?.();
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`HTTP ${res.status}:`, body);
        throw new Error(`HTTP ${res.status}`);
      }

      return res.json();
    },
    [token, buildAuthHeaders, onLogout]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [acc, cond, st] = await Promise.all([
        fetchJSON(`${API}/admin/accesos`),
        fetchJSON(`${API}/admin/conductores`),
        fetchJSON(`${API}/admin/stats`),
      ]);

      setAccesos(Array.isArray(acc) ? acc : []);
      setConductores(Array.isArray(cond) ? cond : []);
      setStats(
        st && typeof st === "object"
          ? st
          : { total_users: 0, logins_today: 0, total_programs: 0 }
      );
    } catch (e) {
      console.error(e);
      setAccesos([]);
      setConductores([]);
      setStats({ total_users: 0, logins_today: 0, total_programs: 0 });
    } finally {
      setLoading(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="dash-root">
      <div className="scanline" />

      <div className="dash-topbar">
        <div className="dash-brand">
          <img src={logoUMG} alt="Logo UMG" className="brand-logo" />
          <span className="brand-name">UMG ROVER — ADMIN DASHBOARD</span>
        </div>

        <div className="dash-actions">
          {onGoEditor && (
            <button className="btn btn-sm btn-primary" onClick={onGoEditor}>
              ⚡ EDITOR
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={onLogout}>
            EXIT
          </button>
        </div>
      </div>

      <div className="dash-body">
        <div className="stats-row">
          <div className="stat-card panel corner-tl">
            <div className="stat-value">{stats.total_users}</div>
            <div className="stat-label">PILOTOS REGISTRADOS</div>
            <div className="stat-icon">👥</div>
          </div>

          <div
            className="stat-card panel corner-tl"
            style={{ "--accent": "var(--accent-orange)" }}
          >
            <div
              className="stat-value"
              style={{ color: "var(--accent-orange)" }}
            >
              {stats.logins_today}
            </div>
            <div className="stat-label">ACCESOS HOY</div>
            <div className="stat-icon">🔐</div>
          </div>

          <div
            className="stat-card panel corner-tl"
            style={{ "--accent": "var(--accent-purple)" }}
          >
            <div
              className="stat-value"
              style={{ color: "var(--accent-purple)" }}
            >
              {stats.total_programs}
            </div>
            <div className="stat-label">PROGRAMAS GUARDADOS</div>
            <div className="stat-icon">📂</div>
          </div>

          <div
            className="stat-card panel corner-tl"
            style={{ "--accent": "var(--accent-green)" }}
          >
            <div
              className="stat-value"
              style={{ color: "var(--accent-green)", fontSize: 16 }}
            >
              EN LÍNEA
            </div>
            <div className="stat-label">ESTADO DEL SISTEMA</div>
            <div className="stat-icon">🟢</div>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 0 }}>
          <button
            className={`tab ${tab === "accesos" ? "active" : ""}`}
            onClick={() => setTab("accesos")}
          >
            📋 ACCESOS ({Array.isArray(accesos) ? accesos.length : 0})
          </button>

          <button
            className={`tab ${tab === "conductores" ? "active" : ""}`}
            onClick={() => setTab("conductores")}
          >
            👥 PILOTOS ({Array.isArray(conductores) ? conductores.length : 0})
          </button>

          <button
            className="btn btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={fetchData}
          >
            ↻ ACTUALIZAR
          </button>
        </div>

        <div className="dash-table-wrap panel">
          {loading ? (
            <div className="dash-loading">
              <div className="loading-spinner" />
              <span>Cargando datos en tiempo real...</span>
            </div>
          ) : tab === "accesos" ? (
            <div className="table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PILOTO</th>
                    <th>AVATAR</th>
                    <th>FECHA INGRESO</th>
                    <th>FECHA SALIDA</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>

                <tbody>
                  {(Array.isArray(accesos) ? accesos : []).map((a, i) => {
                    const avatarSrc = getAvatarSrc(a?.avatar);

                    return (
                      <tr key={a?.id ?? i}>
                        <td className="tok-dim">{i + 1}</td>
                        <td className="pilot-name">{a?.nickname ?? "—"}</td>
                        <td>
                          <div className="mini-avatar">
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt="avatar"
                                className="avatar-img"
                              />
                            ) : (
                              <div className="avatar-placeholder">👤</div>
                            )}
                          </div>
                        </td>
                        <td className="console-text">
                          {a?.ingreso
                            ? new Date(a.ingreso).toLocaleString()
                            : "—"}
                        </td>
                        <td className="console-text">
                          {a?.salida
                            ? new Date(a.salida).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          {a?.salida ? (
                            <span className="badge badge-off">OFFLINE</span>
                          ) : (
                            <span className="badge badge-on">● ACTIVO</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {(Array.isArray(accesos) ? accesos.length : 0) === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          color: "var(--text-dim)",
                          padding: 24,
                        }}
                      >
                        Sin registros de acceso
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="conductores-grid">
              {(Array.isArray(conductores) ? conductores : []).map((c, idx) => {
                const avatarSrc = getAvatarSrc(c?.avatar);

                return (
                  <div key={c?.id ?? idx} className="conductor-card panel">
                    <div className="conductor-avatar">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt="avatar"
                          className="avatar-img"
                        />
                      ) : (
                        <div className="avatar-placeholder">👤</div>
                      )}
                    </div>

                    <div className="conductor-nick">{c?.nickname ?? "—"}</div>
                    <div className="conductor-email">{c?.email ?? "—"}</div>

                    <div className="conductor-date">
                      Desde:{" "}
                      {c?.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                );
              })}

              {(Array.isArray(conductores) ? conductores.length : 0) === 0 && (
                <p
                  style={{
                    color: "var(--text-dim)",
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  No hay pilotos registrados
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}