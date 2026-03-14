import { useState, useCallback } from "react";
import { useAuth } from "../App";
import WebcamCapture from "../components/WebcamCapture";
import QRLoginScanner from "../components/QRLoginScanner";
import "../styles/auth.css";
import logoUMG from "../assets/avatar-presets/umg/LOGOUMG.png";

const API = "http://localhost:8000";

export default function Login({ onRegister }) {
  const { login } = useAuth();

  const [tab, setTab] = useState("password");
  const [form, setForm] = useState({ nickname: "", password: "" });
  const [faceForm, setFaceForm] = useState({ nickname: "", face_base64: null });
  const [facePreview, setFacePreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = useCallback(
    async (endpoint, payload = null, method = "POST") => {
      setLoading(true);
      setError("");

      try {
        const options = {
          method,
          headers: { "Content-Type": "application/json" },
        };

        if (method !== "GET" && payload) {
          options.body = JSON.stringify(payload);
        }

        const res = await fetch(`${API}${endpoint}`, options);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Error al iniciar sesión");
        }

        localStorage.setItem("umg_token", data.access_token);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token", data.access_token);

        login(data.user);
      } catch (err) {
        setError(err.message || "No se pudo iniciar sesión");
      } finally {
        setLoading(false);
      }
    },
    [login]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await doLogin("/auth/login", form, "POST");
    },
    [doLogin, form]
  );

  const handleFaceSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!faceForm.nickname.trim()) {
        setError("Debes ingresar tu nickname");
        return;
      }

      if (!faceForm.face_base64) {
        setError("Primero captura tu rostro para el acceso facial");
        return;
      }

      await doLogin("/auth/login-face", faceForm, "POST");
    },
    [doLogin, faceForm]
  );

  const handleQrLogin = useCallback(
    async (token) => {
      if (!token) {
        setError("No se pudo leer el token del QR");
        return;
      }

      await doLogin(`/auth/login-qr/${token}`, null, "GET");
    },
    [doLogin]
  );

  const handleQrError = useCallback((msg) => {
    setError(msg);
  }, []);

  const changeTab = useCallback((newTab) => {
    setTab(newTab);
    setError("");
  }, []);

  return (
    <div className="auth-bg">
      <div className="scanline" />
      <div className="auth-grid" />

      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className={`auth-container ${tab !== "password" ? "auth-container-wide" : ""}`}>
        <div className="auth-header">

          {/* LOGO UMG */}
          <div className="auth-umg-logo">
            <img src={logoUMG} alt="UMG Logo" />
          </div>

          {/* Rover icon original */}
          <div className="auth-logo">
            <div className="rover-icon">
              <div className="rover-body" />
              <div className="rover-wheel rover-wheel-l" />
              <div className="rover-wheel rover-wheel-r" />
              <div className="rover-antenna" />
              <div className="rover-eye" />
            </div>
          </div>

          <h1 className="auth-title">UMG BASIC ROVER</h1>
          <p className="auth-subtitle">CONTROL PLATFORM v2.0 · 2026</p>

          <div className="auth-line" />
        </div>

        <div className="mode-switch">
          <button
            className={`mode-btn ${tab === "password" ? "active" : ""}`}
            onClick={() => changeTab("password")}
            type="button"
          >
            🔐 Acceso por clave
          </button>

          <button
            className={`mode-btn ${tab === "face" ? "active" : ""}`}
            onClick={() => changeTab("face")}
            type="button"
          >
            🧠 Reconocimiento facial
          </button>

          <button
            className={`mode-btn ${tab === "qr" ? "active" : ""}`}
            onClick={() => changeTab("qr")}
            type="button"
          >
            📷 Ingreso con QR
          </button>
        </div>

        {/* LOGIN NORMAL */}
        {tab === "password" ? (
          <form className="auth-form panel corner-tl corner-br" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <span className="status-dot active" />
              <span className="label" style={{ margin: 0 }}>
                SYSTEM ACCESS
              </span>
            </div>

            <div className="auth-field">
              <label className="label">PILOTO ID (NICKNAME)</label>
              <input
                className="input"
                type="text"
                placeholder="Ingresa tu nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                required
              />
            </div>

            <div className="auth-field">
              <label className="label">CÓDIGO DE ACCESO</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠</span> {error}
              </div>
            )}

            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? "CONECTANDO..." : "▶ INICIAR MISIÓN"}
            </button>

            <div className="auth-divider">
              <span>¿PRIMERA VEZ EN LA BASE?</span>
            </div>

            <button type="button" className="btn auth-register-btn" onClick={onRegister}>
              + REGISTRAR NUEVO PILOTO
            </button>
          </form>
        ) : tab === "face" ? (
          <form className="auth-form panel corner-tl corner-br" onSubmit={handleFaceSubmit}>
            <div className="auth-form-header">
              <span className="status-dot active" />
              <span className="label">FACIAL ACCESS</span>
            </div>

            <div className="auth-field">
              <label className="label">PILOTO ID (NICKNAME)</label>
              <input
                className="input"
                type="text"
                placeholder="Ingresa tu nickname"
                value={faceForm.nickname}
                onChange={(e) =>
                  setFaceForm((prev) => ({
                    ...prev,
                    nickname: e.target.value,
                  }))
                }
                required
              />
            </div>

            <WebcamCapture
              label="📸 Capturar acceso facial"
              preview={facePreview}
              onCapture={(dataUrl) => {
                setFacePreview(dataUrl);
                setFaceForm((prev) => ({
                  ...prev,
                  face_base64: dataUrl || null,
                }));
              }}
              height={260}
            />

            {error && (
              <div className="auth-error">
                <span>⚠</span> {error}
              </div>
            )}

            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? "VALIDANDO ROSTRO..." : "🧠 ENTRAR CON ROSTRO"}
            </button>
          </form>
        ) : (
          <div className="auth-form panel corner-tl corner-br">
            <div className="auth-form-header">
              <span className="status-dot active" />
              <span className="label">QR ACCESS</span>
            </div>

            <QRLoginScanner
              key={tab}
              onScanSuccess={handleQrLogin}
              onScanError={handleQrError}
            />

            {error && (
              <div className="auth-error">
                <span>⚠</span> {error}
              </div>
            )}
          </div>
        )}

        <div className="auth-footer">
          <span>UMG · INGENIERÍA EN SISTEMAS · 2026</span>
        </div>
      </div>
    </div>
  );
}