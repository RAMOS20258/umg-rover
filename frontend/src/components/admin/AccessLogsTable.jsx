const emptyTdStyle = {
  textAlign: "center",
  color: "var(--text-dim)",
  padding: 24,
};


export default function AccessLogsTable({ accesos = [] }) {
  return (
    <div className="table-scroll">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>PILOTO</th>
            <th>ACCIÓN</th>
            <th>INGRESO</th>
            <th>SALIDA</th>
            <th>IP</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {accesos.map((a, i) => (
            <tr key={a?.id ?? i}>
              <td className="tok-dim">{i + 1}</td>
              <td className="pilot-name">{a?.usuario ?? a?.nickname ?? "—"}</td>
              <td>{a?.accion ?? "—"}</td>
              <td className="console-text">
                {a?.entrada || a?.ingreso
                  ? new Date(a.entrada || a.ingreso).toLocaleString()
                  : "—"}
              </td>
              <td className="console-text">
                {a?.salida ? new Date(a.salida).toLocaleString() : "—"}
              </td>
              <td className="console-text">{a?.ip ?? "—"}</td>
              <td>
                {a?.salida ? (
                  <span className="badge badge-off">OFFLINE</span>
                ) : (
                  <span className="badge badge-on">● ACTIVO</span>
                )}
              </td>
            </tr>
          ))}

          {accesos.length === 0 && (
            <tr>
              <td colSpan={7} style={emptyTdStyle}>
                Sin registros de acceso
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}