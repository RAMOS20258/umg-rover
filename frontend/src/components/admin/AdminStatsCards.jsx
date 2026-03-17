export default function AdminStatsCards({ stats }) {
  const safe = stats || {};

  return (
    <div className="stats-row">
      <div className="stat-card panel corner-tl">
        <div className="stat-value">{safe.usuarios ?? 0}</div>
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
          {safe.programas ?? 0}
        </div>
        <div className="stat-label">PROGRAMAS</div>
        <div className="stat-icon">📂</div>
      </div>

      <div
        className="stat-card panel corner-tl"
        style={{ "--accent": "var(--accent-purple)" }}
      >
        <div
          className="stat-value"
          style={{ color: "var(--accent-purple)" }}
        >
          {safe.simulaciones ?? 0}
        </div>
        <div className="stat-label">SIMULACIONES</div>
        <div className="stat-icon">🛰️</div>
      </div>

      <div
        className="stat-card panel corner-tl"
        style={{ "--accent": "var(--accent-green)" }}
      >
        <div
          className="stat-value"
          style={{ color: "var(--accent-green)" }}
        >
          {safe.errores ?? 0}
        </div>
        <div className="stat-label">ERRORES</div>
        <div className="stat-icon">⚠️</div>
      </div>
    </div>
  );
}