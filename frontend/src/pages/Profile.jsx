import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../App";
import WebcamCapture from "../components/WebcamCapture";
import { evidenceService } from "../services/evidenceService";
import "../styles/profile.css";
import logoUMG from "../assets/avatar-presets/umg/LOGOUMG.png";

export default function Profile({ onBack, onLogout }) {
  const { user } = useAuth();

  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facePreview, setFacePreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resolveAvatarSrc = (userData) => {
    if (!userData) return null;

    if (userData.avatar_base64) {
      return userData.avatar_base64.startsWith("data:image")
        ? userData.avatar_base64
        : `data:image/png;base64,${userData.avatar_base64}`;
    }

    if (userData.avatar) {
      return userData.avatar.startsWith?.("data:image")
        ? userData.avatar
        : `data:image/png;base64,${userData.avatar}`;
    }

    return null;
  };

  const avatarSrc = resolveAvatarSrc(user);

  const fetchEvidencias = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await evidenceService.getMine();
      setEvidencias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error al cargar evidencias");
      setEvidencias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvidencias();
  }, [fetchEvidencias]);

  const handleUploadFaceEvidence = async () => {
    setError("");
    setSuccess("");

    if (!facePreview) {
      setError("Primero debes capturar una imagen.");
      return;
    }

    setSaving(true);

    try {
      await evidenceService.create({
        tipo_evidencia: "FOTO",
        nombre_archivo: `evidencia_${Date.now()}.jpg`,
        archivo_base64: facePreview,
        descripcion: "Evidencia subida desde Mi Perfil",
        fecha_captura: new Date().toISOString().slice(0, 19).replace("T", " "),
        es_principal: false,
      });

      setSuccess("Evidencia subida correctamente.");
      setFacePreview(null);
      fetchEvidencias();
    } catch (err) {
      setError(err.message || "Error al subir evidencia");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrincipal = async (evidenceId) => {
    setError("");
    setSuccess("");

    try {
      await evidenceService.setPrincipal(evidenceId);
      setSuccess("Evidencia principal actualizada.");
      fetchEvidencias();
    } catch (err) {
      setError(err.message || "Error al actualizar evidencia principal");
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    setError("");
    setSuccess("");

    try {
      await evidenceService.remove(evidenceId);
      setSuccess("Evidencia eliminada.");
      fetchEvidencias();
    } catch (err) {
      setError(err.message || "Error al eliminar evidencia");
    }
  };

  return (
    <div className="profile-root">
      <div className="scanline" />

      <div className="profile-topbar">
        <div className="profile-brand">
          <img src={logoUMG} alt="Logo UMG" className="brand-logo" />
          <span className="brand-name">UMG ROVER — MI PERFIL</span>
        </div>

        <div className="profile-actions">
          {onBack && (
            <button className="btn btn-sm btn-primary" onClick={onBack}>
              ← VOLVER
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={onLogout}>
            EXIT
          </button>
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-left panel corner-tl">
          <div className="panel-header">PERFIL DEL PILOTO</div>

          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <span>👤</span>}
            </div>
          </div>

          <div className="profile-data">
            <div className="profile-line">
              <span className="profile-label">NICKNAME</span>
              <span className="profile-value">{user?.nickname || "—"}</span>
            </div>

            <div className="profile-line">
              <span className="profile-label">EMAIL</span>
              <span className="profile-value">{user?.email || "—"}</span>
            </div>

            <div className="profile-line">
              <span className="profile-label">ROL</span>
              <span className="profile-value">{user?.role?.toUpperCase() || "—"}</span>
            </div>
          </div>

          <div className="profile-upload-block">
            <div className="panel-header" style={{ marginBottom: 12 }}>
              NUEVA EVIDENCIA
            </div>

            <WebcamCapture
              label="📸 Capturar evidencia"
              preview={facePreview}
              onCapture={(dataUrl) => setFacePreview(dataUrl)}
              height={220}
            />

            <button
              className="btn btn-primary auth-submit"
              onClick={handleUploadFaceEvidence}
              disabled={saving}
              style={{ marginTop: 14 }}
            >
              {saving ? "SUBIENDO..." : "⬆ SUBIR EVIDENCIA"}
            </button>
          </div>

          {error && (
            <div className="auth-error" style={{ marginTop: 14 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {success && (
            <div className="auth-ok" style={{ marginTop: 14 }}>
              ✓ {success}
            </div>
          )}
        </div>

        <div className="profile-right panel corner-tl">
          <div className="panel-header">
            MIS EVIDENCIAS ({Array.isArray(evidencias) ? evidencias.length : 0})
          </div>

          {loading ? (
            <div className="profile-loading">
              <div className="loading-spinner" />
              <span>Cargando evidencias...</span>
            </div>
          ) : evidencias.length === 0 ? (
            <div className="profile-empty">No hay evidencias registradas.</div>
          ) : (
            <div className="profile-evidence-grid">
              {evidencias.map((ev) => (
                <div key={ev.id} className="evidence-card panel">
                  <div className="evidence-top">
                    <span className="evidence-type">{ev.tipo_evidencia}</span>
                    {ev.es_principal ? (
                      <span className="badge badge-on">● PRINCIPAL</span>
                    ) : (
                      <span className="badge badge-off">SECUNDARIA</span>
                    )}
                  </div>

                  <div className="evidence-name">{ev.nombre_archivo}</div>
                  <div className="evidence-desc">{ev.descripcion || "Sin descripción"}</div>
                  <div className="evidence-date">
                    {ev.fecha_subida ? new Date(ev.fecha_subida).toLocaleString() : "—"}
                  </div>

                  <div className="evidence-actions">
                    {!ev.es_principal && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSetPrincipal(ev.id)}
                      >
                        ★ PRINCIPAL
                      </button>
                    )}

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteEvidence(ev.id)}
                    >
                      🗑 ELIMINAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}