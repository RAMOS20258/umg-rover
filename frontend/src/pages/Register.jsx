import { useCallback, useState } from "react";
import { authService } from "../services/authService";
import WebcamCapture from "../components/WebcamCapture";
import AvatarPresetPicker from "../components/AvatarPresetPicker";
import "../styles/auth.css";

export default function Register({ onLogin }) {
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    email_confirm: "",
    phone: "",
    phone_confirm: "",
    password: "",
    password_confirm: "",
    nickname: "",
    avatar_base64: null,
    avatar_config: null,
    face_base64: null,
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const saveDataUrl = (field, setter) => (dataUrl) => {
    setter(dataUrl);
    setForm((prev) => ({
      ...prev,
      [field]: dataUrl || null,
    }));
  };

  const handleAvatarReady = useCallback((dataUrl) => {
    setAvatarPreview(dataUrl);
    setForm((prev) => ({
      ...prev,
      avatar_base64: dataUrl || null,
    }));
  }, []);

  const handleAvatarMetaChange = useCallback((meta) => {
    setForm((prev) => ({
      ...prev,
      avatar_config: meta || null,
    }));
  }, []);

  const validateForm = () => {
    if (!form.nombres.trim()) return "Debes ingresar tus nombres.";
    if (!form.apellidos.trim()) return "Debes ingresar tus apellidos.";
    if (form.email !== form.email_confirm) return "Los correos no coinciden.";
    if (form.phone !== form.phone_confirm) return "Los teléfonos no coinciden.";
    if (form.password !== form.password_confirm) return "Las contraseñas no coinciden.";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!form.nickname.trim()) return "Debes ingresar un nickname.";
    if (!form.avatar_base64) return "Debes seleccionar un avatar.";
    if (!form.face_base64) {
      return "Debes capturar una selfie para registrar el reconocimiento facial.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setLoading(false);
      setError(validationError);
      return;
    }

    try {
      const payload = {
        ...form,
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        email_confirm: form.email_confirm.trim(),
        phone: form.phone.trim(),
        phone_confirm: form.phone_confirm.trim(),
        nickname: form.nickname.trim(),
      };

      const data = await authService.register(payload);

      const delivery = data.delivery || {};
      setSuccess(
        `¡Registro exitoso! Correo: ${delivery.email || "pendiente"} · WhatsApp: ${
          delivery.whatsapp || "pendiente"
        }`
      );

      setTimeout(() => {
        onLogin();
      }, 2800);
    } catch (err) {
      setError(err.message || "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  return (
    <div className="auth-bg">
      <div className="scanline" />
      <div className="auth-grid" />

      <div className="auth-container" style={{ width: 700 }}>
        <div className="auth-header">
          <h1 className="auth-title">NUEVO PILOTO</h1>
          <p className="auth-subtitle">REGISTRO EN SISTEMA DE CONTROL</p>
          <div className="auth-line" />
        </div>

        <form
          className="auth-form panel corner-tl corner-br register-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-form-header">
            <span className="status-dot active" />
            <span className="label" style={{ margin: 0 }}>
              DATOS DE REGISTRO
            </span>
          </div>

          <div className="register-section">IDENTIDAD PERSONAL</div>

          <div className="auth-field">
            <label className="label">NOMBRES</label>
            <input
              className="input"
              type="text"
              autoComplete="given-name"
              placeholder="Ej: Nicolle María"
              required
              {...f("nombres")}
            />
          </div>

          <div className="auth-field">
            <label className="label">APELLIDOS</label>
            <input
              className="input"
              type="text"
              autoComplete="family-name"
              placeholder="Ej: Revolorio López"
              required
              {...f("apellidos")}
            />
          </div>

          <div className="register-section">AVATAR</div>
          <p className="mini-help">
            Elige un avatar estilo Roblox/cartoon. Luego se guardará como tu imagen de perfil.
          </p>

          <AvatarPresetPicker
            onAvatarReady={handleAvatarReady}
            onAvatarMetaChange={handleAvatarMetaChange}
          />

          <div className="avatar-upload" style={{ marginTop: 14 }}>
            <div className="avatar-preview">
              {avatarPreview ? <img src={avatarPreview} alt="avatar" /> : <span>👤</span>}
            </div>
          </div>

          <div className="register-section">RECONOCIMIENTO FACIAL</div>
          <p className="mini-help">
            Captura una selfie frontal. Esta se usará para el acceso facial.
          </p>

          <WebcamCapture
            label="📸 Capturar rostro"
            onCapture={saveDataUrl("face_base64", setFacePreview)}
            preview={facePreview}
            height={240}
          />

          <div className="register-section">CORREO ELECTRÓNICO</div>

          <div className="auth-field">
            <label className="label">CORREO</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              required
              {...f("email")}
            />
          </div>

          <div className="auth-field">
            <label className="label">CONFIRMAR CORREO</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="confirmar correo"
              required
              {...f("email_confirm")}
            />
          </div>

          <div className="register-section">TELÉFONO / WHATSAPP</div>

          <div className="auth-field">
            <label className="label">TELÉFONO (+502...)</label>
            <input
              className="input"
              type="tel"
              autoComplete="tel"
              placeholder="+50212345678"
              required
              {...f("phone")}
            />
          </div>

          <div className="auth-field">
            <label className="label">CONFIRMAR TELÉFONO</label>
            <input
              className="input"
              type="tel"
              autoComplete="tel"
              placeholder="+50212345678"
              required
              {...f("phone_confirm")}
            />
          </div>

          <div className="register-section">CÓDIGO DE ACCESO</div>

          <div className="auth-field">
            <label className="label">PASSWORD</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="mínimo 8 caracteres"
              required
              {...f("password")}
            />
          </div>

          <div className="auth-field">
            <label className="label">CONFIRMAR PASSWORD</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="confirmar password"
              required
              {...f("password_confirm")}
            />
          </div>

          <div className="register-section">IDENTIDAD DEL SISTEMA</div>

          <div className="auth-field">
            <label className="label">NICKNAME DE PILOTO</label>
            <input
              className="input"
              type="text"
              autoComplete="username"
              placeholder="ej: RoverPilot42"
              required
              {...f("nickname")}
            />
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          {success && <div className="auth-ok">✓ {success}</div>}

          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "PROCESANDO..." : "🚀 UNIRSE A LA MISIÓN"}
          </button>

          <button
            type="button"
            className="btn auth-register-btn"
            onClick={onLogin}
          >
            ← VOLVER AL ACCESO
          </button>
        </form>
      </div>
    </div>
  );
}