const emptyTdStyle = {
  textAlign: "center",
  color: "var(--text-dim)",
  padding: 24,
};

export default function AdminErrores({ errores = [] }) {
  return (
    <div className="table-scroll">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>USUARIO</th>
            <th>TIPO</th>
            <th>MENSAJE</th>
            <th>SEVERIDAD</th>
            <th>FECHA</th>
          </tr>
        </thead>
        <tbody>
          {errores.map((e, i) => (
            <tr key={e?.id ?? i}>
              <td className="tok-dim">{i + 1}</td>
              <td className="pilot-name">{e?.usuario ?? "—"}</td>
              <td>{e?.tipo ?? "—"}</td>
              <td className="console-text">{e?.mensaje ?? "—"}</td>
              <td>
                <span
                  className={`badge ${
                    e?.severidad === "ALTA" || e?.severidad === "CRITICA"
                      ? "badge-off"
                      : "badge-on"
                  }`}
                >
                  {e?.severidad ?? "—"}
                </span>
              </td>
              <td className="console-text">
                {e?.fecha ? new Date(e.fecha).toLocaleString() : "—"}
              </td>
            </tr>
          ))}

          {errores.length === 0 && (
            <tr>
              <td colSpan={6} style={emptyTdStyle}>
                Sin errores del compilador
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}