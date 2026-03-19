const emptyTdStyle = {
  textAlign: "center",
  color: "var(--text-dim)",
  padding: 24,
};

export default function CredentialsTable({ credenciales = [] }) {
  return (
    <div className="table-scroll">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>USUARIO</th>
            <th>CÓDIGO</th>
            <th>FECHA</th>
            <th>ESTADO</th>
            <th>EMAIL</th>
            <th>WHATSAPP</th>
          </tr>
        </thead>
        <tbody>
          {credenciales.map((c, i) => (
            <tr key={c?.id ?? i}>
              <td className="tok-dim">{i + 1}</td>
              <td className="pilot-name">{c?.usuario ?? "—"}</td>
              <td className="console-text">{c?.codigo ?? "—"}</td>
              <td className="console-text">
                {c?.fecha ? new Date(c.fecha).toLocaleString() : "—"}
              </td>
              <td>{c?.estado ?? "—"}</td>
              <td>
                {c?.email ? (
                  <span className="badge badge-on">ENVIADO</span>
                ) : (
                  <span className="badge badge-off">NO</span>
                )}
              </td>
              <td>
                {c?.whatsapp ? (
                  <span className="badge badge-on">ENVIADO</span>
                ) : (
                  <span className="badge badge-off">NO</span>
                )}
              </td>
            </tr>
          ))}

          {credenciales.length === 0 && (
            <tr>
              <td colSpan={7} style={emptyTdStyle}>
                Sin credenciales generadas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}