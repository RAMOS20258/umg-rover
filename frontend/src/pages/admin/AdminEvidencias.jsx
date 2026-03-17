const emptyTdStyle = {
  textAlign: "center",
  color: "var(--text-dim)",
  padding: 24,
};

export default function AdminEvidencias({ evidencias = [] }) {
  return (
    <div className="table-scroll">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>USUARIO</th>
            <th>TIPO</th>
            <th>ARCHIVO</th>
            <th>FECHA</th>
            <th>PRINCIPAL</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {evidencias.map((e, i) => (
            <tr key={e?.id ?? i}>
              <td className="tok-dim">{i + 1}</td>
              <td className="pilot-name">{e?.usuario ?? "—"}</td>
              <td>{e?.tipo ?? "—"}</td>
              <td className="console-text">{e?.archivo ?? "—"}</td>
              <td className="console-text">
                {e?.fecha ? new Date(e.fecha).toLocaleString() : "—"}
              </td>
              <td>
                {e?.principal ? (
                  <span className="badge badge-on">SÍ</span>
                ) : (
                  <span className="badge badge-off">NO</span>
                )}
              </td>
              <td>{e?.estado ?? "—"}</td>
            </tr>
          ))}

          {evidencias.length === 0 && (
            <tr>
              <td colSpan={7} style={emptyTdStyle}>
                Sin evidencias registradas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}