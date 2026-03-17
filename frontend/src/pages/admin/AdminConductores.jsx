const emptyGridStyle = {
  color: "var(--text-dim)",
  gridColumn: "1/-1",
  textAlign: "center",
  padding: 24,
};

function getAvatarSrc(avatar) {
  if (!avatar || typeof avatar !== "string") return null;
  if (avatar.startsWith("data:image")) return avatar;
  return `data:image/jpeg;base64,${avatar}`;
}

export default function AdminConductores({ conductores = [] }) {
  return (
    <div className="conductores-grid">
      {conductores.map((c, idx) => {
        const avatarSrc = getAvatarSrc(c?.avatar);

        return (
          <div key={c?.id ?? idx} className="conductor-card panel">
            <div className="conductor-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">👤</div>
              )}
            </div>

            <div className="conductor-nick">{c?.nickname ?? "—"}</div>
            <div className="conductor-email">{c?.email ?? "—"}</div>

            <div className="conductor-date">
              Rol: {c?.role ?? c?.rol ?? "—"}
            </div>

            <div className="conductor-date">
              Desde:{" "}
              {c?.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
            </div>

            <div style={{ marginTop: 8 }}>
              {c?.activo || c?.is_active ? (
                <span className="badge badge-on">● ACTIVO</span>
              ) : (
                <span className="badge badge-off">INACTIVO</span>
              )}
            </div>
          </div>
        );
      })}

      {conductores.length === 0 && (
        <p style={emptyGridStyle}>No hay pilotos registrados</p>
      )}
    </div>
  );
}