import { useEffect, useState } from "react";
import {
  getRoverStatus,
  compileAndRun,
  stopRover,
  sendManualCommand,
} from "..src/services/roverApi";

export default function RoverPanel() {
  const [code, setCode] = useState(
    "PROGRAM demo BEGIN avanzar_ctms(20); girar(1)+avanzar_ctms(10); END."
  );
  const [roverStatus, setRoverStatus] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await getRoverStatus();
        setRoverStatus(data);
      } catch {
        setRoverStatus(null);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCompile = async () => {
    try {
      const result = await compileAndRun(code);
      setMessage(result.message || "Compilado correctamente");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleStop = async () => {
    try {
      const result = await stopRover();
      setMessage(result.message || "Rover detenido");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleManual = async (cmd) => {
    try {
      const result = await sendManualCommand(cmd);
      setMessage(result.message || `Comando enviado: ${cmd}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Control Rover</h2>

      <p>
        Estado del carrito:{" "}
        {roverStatus?.connected ? (
          <span style={{ color: "green", fontWeight: "bold" }}>🟢 Conectado</span>
        ) : (
          <span style={{ color: "red", fontWeight: "bold" }}>🔴 Desconectado</span>
        )}
      </p>

      <p>
        Ejecutando:{" "}
        <strong>{roverStatus?.state?.current_command || "stop"}</strong>
      </p>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: "12px" }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <button onClick={handleCompile}>🚀 Compilar y ejecutar</button>
        <button onClick={handleStop}>🛑 Stop</button>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <button onClick={() => handleManual("forward")}>Adelante</button>
        <button onClick={() => handleManual("backward")}>Atrás</button>
        <button onClick={() => handleManual("left")}>Izquierda</button>
        <button onClick={() => handleManual("right")}>Derecha</button>
      </div>

      <p>{message}</p>
    </div>
  );
}