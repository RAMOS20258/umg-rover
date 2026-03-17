import { useAuth } from "../../App";
import "../../styles/dashboard.css";
import logoUMG from "../../assets/avatar-presets/umg/LOGOUMG.png";

import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import AdminStatsCards from "../../components/admin/AdminStatsCards";
import AdminAccesos from "./AdminAccesos";
import AdminConductores from "./AdminConductores";
import AdminEvidencias from "./AdminEvidencias";
import AdminErrores from "./AdminErrores";
import AdminCredenciales from "./AdminCredenciales";

export default function AdminDashboard({ onLogout, onGoEditor }) {
  const { user } = useAuth();

  const {
    tab,
    setTab,
    loading,
    stats,
    accesos,
    conductores,
    evidencias,
    errores,
    credenciales,
    fetchData,
  } = useAdminDashboard();

  const renderCurrentTab = () => {
    if (loading) {
      return (
        <div className="dash-loading">
          <div className="loading-spinner" />
          <span>Cargando datos en tiempo real...</span>
        </div>
      );
    }

    switch (tab) {
      case "accesos":
        return <AdminAccesos accesos={accesos} />;
      case "conductores":
        return <AdminConductores conductores={conductores} />;
      case "evidencias":
        return <AdminEvidencias evidencias={evidencias} />;
      case "errores":
        return <AdminErrores errores={errores} />;
      case "credenciales":
        return <AdminCredenciales credenciales={credenciales} />;
      default:
        return <AdminAccesos accesos={accesos} />;
    }
  };

  return (
    <div className="dash-root">
      <div className="scanline" />

      <div className="dash-topbar">
        <div className="dash-brand">
          <img src={logoUMG} alt="Logo UMG" className="brand-logo" />
          <span className="brand-name">
            UMG ROVER — {user?.role === "supervisor" ? "SUPERVISOR" : "ADMIN"}{" "}
            DASHBOARD
          </span>
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
        <AdminStatsCards stats={stats} />

        <div
          className="tab-bar"
          style={{ marginBottom: 0, flexWrap: "wrap", gap: 8 }}
        >
          <button
            className={`tab ${tab === "accesos" ? "active" : ""}`}
            onClick={() => setTab("accesos")}
          >
            📋 ACCESOS ({accesos.length})
          </button>

          <button
            className={`tab ${tab === "conductores" ? "active" : ""}`}
            onClick={() => setTab("conductores")}
          >
            👥 PILOTOS ({conductores.length})
          </button>

          <button
            className={`tab ${tab === "evidencias" ? "active" : ""}`}
            onClick={() => setTab("evidencias")}
          >
            📸 EVIDENCIAS ({evidencias.length})
          </button>

          <button
            className={`tab ${tab === "errores" ? "active" : ""}`}
            onClick={() => setTab("errores")}
          >
            ⚠️ ERRORES ({errores.length})
          </button>

          <button
            className={`tab ${tab === "credenciales" ? "active" : ""}`}
            onClick={() => setTab("credenciales")}
          >
            🪪 CREDENCIALES ({credenciales.length})
          </button>

          <button
            className="btn btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={fetchData}
          >
            ↻ ACTUALIZAR
          </button>
        </div>

        <div className="dash-table-wrap panel">{renderCurrentTab()}</div>
      </div>
    </div>
  );
}
