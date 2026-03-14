// Console.jsx
import { useEffect, useRef } from "react";
import "../styles/console.css";

export default function Console({ logs, onClear }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  return (
    <div className="console-panel panel">
      <div className="console-header">
        <span className="status-dot active" />
        <span className="label" style={{ margin: 0 }}>BITÁCORA DEL SISTEMA</span>
        <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={onClear}>🗑 LIMPIAR</button>
      </div>
      <div className="console-body">
        {logs.map((log, i) => (
          <div key={i} className={`console-text console-${log.type}`}>
            {log.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
